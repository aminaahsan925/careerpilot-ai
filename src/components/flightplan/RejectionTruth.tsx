import { motion } from "motion/react";
import { Layers, ShieldX, XOctagon } from "lucide-react";

import type { MirrorRejectionReason, MirrorTruth } from "@/lib/jobmirror.server";
import { KineticText } from "@/components/lens/KineticText";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import { Cite } from "./MarketTruthNote";

/** Why juniors get filtered out of this specific role. */
function WhatJuniorsLack({ items }: { items: MirrorTruth[] }) {
  if (items.length === 0) return null;

  return (
    <SpotlightCard className="card-surface p-6 sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cp-ember/10 text-cp-ember">
        <ShieldX className="h-5 w-5" strokeWidth={1.7} />
      </div>
      <h3 className="mt-6 font-display text-lg font-semibold text-cp-paper">
        <KineticText text="Why juniors get filtered out of this role" />
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-cp-stone">
        Recruiters and hiring engineers named these specifically. Read them as a checklist against
        yourself, not as general advice.
      </p>
      <ul className="mt-5 space-y-3.5">
        {items.map((item, index) => (
          <motion.li
            key={item.statement}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
            className="flex gap-3"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cp-ember" />
            <div className="min-w-0">
              <p className="text-sm leading-6 text-cp-paper">{item.statement}</p>
              <Cite citation={item.citation} />
            </div>
          </motion.li>
        ))}
      </ul>
    </SpotlightCard>
  );
}

/** The cross-cutting reasons entry-level applications get rejected. */
function RejectionReasons({ reasons }: { reasons: MirrorRejectionReason[] }) {
  if (reasons.length === 0) return null;

  return (
    <SpotlightCard className="card-surface p-6 sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cp-ember/10 text-cp-ember">
        <XOctagon className="h-5 w-5" strokeWidth={1.7} />
      </div>
      <h3 className="mt-6 font-display text-lg font-semibold text-cp-paper">
        <KineticText text="The top reasons entry-level applications get rejected" />
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-cp-stone">
        Ranked across all entry-level tech hiring, not just your role.
      </p>

      <div className="mt-6 space-y-6">
        {reasons.map((reason) => (
          <div className="border-b border-border pb-6 last:border-0 last:pb-0" key={reason.rank}>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-xl font-semibold text-cp-lime">
                {reason.rank}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-cp-paper">{reason.title}</p>
                <p className="mt-1.5 text-sm leading-6 text-cp-stone">{reason.detail}</p>
              </div>
            </div>

            {reason.stats.length > 0 && (
              <div className="mt-4 grid gap-3 pl-9 sm:grid-cols-2">
                {reason.stats.map((stat) => (
                  <div className="rounded-2xl bg-white/[0.04] p-4" key={stat.label}>
                    <p className="font-display text-xl font-semibold leading-none text-cp-paper">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-xs font-medium text-cp-paper">{stat.label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-cp-stone">{stat.detail}</p>
                    <div className="mt-1.5">
                      <Cite citation={stat.citation} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reason.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 pl-9">
                {reason.citations.map((citation) => (
                  <Cite citation={citation} key={citation.label} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </SpotlightCard>
  );
}

/** What counts as proof, strongest first, plus this role's specifics. */
function EvidenceLadder({
  hierarchy,
  trusted,
}: {
  hierarchy: { rank: number; label: string; detail: string }[];
  trusted: MirrorTruth[];
}) {
  return (
    <SpotlightCard className="card-surface p-6 sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cp-lime/10 text-cp-lime">
        <Layers className="h-5 w-5" strokeWidth={1.7} />
      </div>
      <h3 className="mt-6 font-display text-lg font-semibold text-cp-paper">
        <KineticText text="What actually counts as proof" />
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-cp-stone">
        Strongest evidence first. Anything below the line you can produce is where your effort
        should go.
      </p>

      <ol className="mt-5 space-y-3">
        {hierarchy.map((tier) => (
          <li className="flex gap-3" key={tier.rank}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cp-lime/10 font-mono text-xs font-semibold text-cp-lime">
              {tier.rank}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-cp-paper">{tier.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-cp-stone">{tier.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      {trusted.length > 0 && (
        <>
          <div className="my-6 h-px bg-border" />
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cp-stone">
            Accepted for this role specifically
          </p>
          <ul className="mt-3 space-y-2.5">
            {trusted.map((item) => (
              <li className="flex gap-3" key={item.statement}>
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
                <div className="min-w-0">
                  <p className="text-sm leading-6 text-cp-paper">{item.statement}</p>
                  <Cite citation={item.citation} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </SpotlightCard>
  );
}

/**
 * Step 3 of the Flight Plan, Round 3: the uncomfortable half. Every
 * claim here is a sourced finding from the research dataset, not a
 * generated warning.
 */
export function RejectionTruth({
  whatJuniorsLack,
  rejectionReasons,
  evidenceHierarchy,
  evidenceEmployersTrust,
}: {
  whatJuniorsLack: MirrorTruth[];
  rejectionReasons: MirrorRejectionReason[];
  evidenceHierarchy: { rank: number; label: string; detail: string }[];
  evidenceEmployersTrust: MirrorTruth[];
}) {
  return (
    <div className="space-y-6">
      <WhatJuniorsLack items={whatJuniorsLack} />
      <EvidenceLadder hierarchy={evidenceHierarchy} trusted={evidenceEmployersTrust} />
      <RejectionReasons reasons={rejectionReasons} />
    </div>
  );
}
