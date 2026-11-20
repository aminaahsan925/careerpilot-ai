import { useState } from "react";
import {
  ArrowRight,
  Award,
  Building2,
  Globe2,
  Lightbulb,
  ListChecks,
  ShieldX,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import type { JobMirrorReport } from "@/lib/jobmirror.server";
import { cn } from "@/lib/utils";
import { KineticText } from "@/components/lens/KineticText";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import { FitVerdict } from "./FitVerdict";
import { FlightPlanHero } from "./FlightPlanHero";
import { JobReadinessAssessment } from "./JobReadinessAssessment";
import { Cite, Provenance } from "./MarketTruthNote";
import { RejectionTruth } from "./RejectionTruth";
import { SkillMirror } from "./SkillMirror";

type FlightPlanTab = "readiness" | "skills" | "filters" | "dataset" | "verdict";

/* ------------------------------------------------------------------ */
/* Role Picker                                                        */
/* ------------------------------------------------------------------ */

function RolePicker({
  report,
  activeRole,
  onPick,
}: {
  report: JobMirrorReport;
  activeRole: string | null;
  onPick: (roleId: string | null) => void;
}) {
  return (
    <SpotlightCard className="card-surface space-y-4 p-6 sm:p-8">
      <div>
        <h3 className="font-display text-lg font-bold text-cp-paper">
          <KineticText text="Target Role Selection" />
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-cp-stone">
          Select any of the in-depth researched industry roles to mirror your skills against real
          market demands.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {activeRole !== null && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="rounded-xl border border-cp-lime/40 bg-cp-lime/10 px-4 py-2 text-xs font-semibold text-cp-lime transition hover:bg-cp-lime hover:text-cp-ink"
          >
            Use Saved Target ({report.role.requested})
          </button>
        )}
        {report.researchedRoles.map((role) => {
          const isActive = report.role.roleId === role.roleId;
          return (
            <button
              type="button"
              key={role.roleId}
              onClick={() => onPick(role.displayName)}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
                isActive
                  ? "bg-cp-lime text-cp-ink shadow-lift"
                  : "border border-border bg-secondary/80 text-cp-paper hover:bg-secondary",
              )}
            >
              {role.displayName}
            </button>
          );
        })}
      </div>
    </SpotlightCard>
  );
}

/* ------------------------------------------------------------------ */
/* Tabbed Pakistan Dataset & Market Context                           */
/* ------------------------------------------------------------------ */

function PakistanContext({ pakistan }: { pakistan: JobMirrorReport["pakistan"] }) {
  const [dataTab, setDataTab] = useState<"norms" | "houses" | "comparison" | "freelance">("norms");

  return (
    <SpotlightCard className="card-surface space-y-6 p-6 sm:p-8">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cp-lime/10 text-cp-lime">
            <Globe2 className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-cp-paper">
              <KineticText text="Market Research Dataset" />
            </h3>
            <p className="text-xs text-cp-stone">
              Verifiable hiring norms and entry paths for tech professionals.
            </p>
          </div>
        </div>

        {/* Dataset Sub-Tabs */}
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-secondary/60 p-1">
          {[
            { id: "norms", label: "Hiring Norms" },
            { id: "houses", label: "Software Houses" },
            { id: "comparison", label: "Local vs Global" },
            { id: "freelance", label: "Freelance Reality" },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setDataTab(tab.id as typeof dataTab)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition",
                dataTab === tab.id
                  ? "bg-cp-lime text-cp-ink shadow-sm"
                  : "text-cp-stone hover:text-cp-paper",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {dataTab === "norms" && (
          <motion.div
            key="norms"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <h4 className="text-[13px] font-bold text-cp-paper">Verified Local Hiring Standards</h4>
            {pakistan.hiringNorms.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {pakistan.hiringNorms.map((norm) => (
                  <div
                    key={norm.statement}
                    className="rounded-xl border border-border/80 bg-white/[0.03] p-4"
                  >
                    <p className="text-[13px] font-medium leading-relaxed text-cp-paper">
                      {norm.statement}
                    </p>
                    <div className="mt-2 border-t border-border/50 pt-2">
                      <Cite citation={norm.citation} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-cp-stone">
                No specific hiring norm data recorded for this role.
              </p>
            )}
          </motion.div>
        )}

        {dataTab === "houses" && (
          <motion.div
            key="houses"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cp-lime" />
              <h4 className="text-[13px] font-bold text-cp-paper">
                Primary Entry Software Houses & Agencies
              </h4>
            </div>
            <p className="text-xs text-cp-stone">
              Software houses identified in research as standard career launching pads:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {pakistan.softwareHouses.map((house) => (
                <span
                  key={house}
                  className="rounded-lg border border-border bg-secondary px-3.5 py-2 text-xs font-semibold text-cp-paper shadow-sm"
                >
                  {house}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {dataTab === "comparison" && (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <h4 className="text-[13px] font-bold text-cp-paper">
              Local Employers vs. International Remote Clients
            </h4>
            {pakistan.employerVsInternationalClient.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2.5 font-bold uppercase tracking-wider text-cp-stone">
                        Dimension
                      </th>
                      <th className="pb-2.5 font-bold uppercase tracking-wider text-cp-stone">
                        Pakistani Employers
                      </th>
                      <th className="pb-2.5 font-bold uppercase tracking-wider text-cp-ember">
                        International Clients
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pakistan.employerVsInternationalClient.map((row) => (
                      <tr className="border-b border-border/60 last:border-0" key={row.dimension}>
                        <td className="py-3 font-semibold text-cp-paper">{row.dimension}</td>
                        <td className="py-3 pr-4 text-cp-stone">{row.pakistaniEmployers}</td>
                        <td className="py-3 font-medium text-cp-paper">
                          {row.internationalClients}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-cp-stone">
                Comparative matrix available for core technical roles.
              </p>
            )}
          </motion.div>
        )}

        {dataTab === "freelance" && (
          <motion.div
            key="freelance"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <h4 className="text-[13px] font-bold text-cp-paper">Freelance Route Analysis</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {pakistan.freelanceReality.map((item) => (
                <div
                  key={item.statement}
                  className="rounded-xl border border-border/80 bg-white/[0.03] p-4"
                >
                  <p className="text-[13px] leading-relaxed text-cp-paper">{item.statement}</p>
                  <div className="mt-2 border-t border-border/50 pt-2">
                    <Cite citation={item.citation} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SpotlightCard>
  );
}

function HowItWorksCard() {
  const stages = [
    {
      title: "1. Verified Research Data",
      text: "Expectations come from cited industry research, not synthetic filler.",
    },
    {
      title: "2. Evidence-Based Matching",
      text: "Skills count as proven only when backed by code or project proof.",
    },
    {
      title: "3. Targeted Priority Build",
      text: "Identify the single project proof that closes your biggest gap.",
    },
  ];

  return (
    <SpotlightCard className="card-surface h-fit space-y-4 p-6 sm:p-7">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cp-lime/10 text-cp-lime">
        <Lightbulb className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <h3 className="font-display text-base font-bold text-cp-paper">
        <KineticText text="Flight Plan Protocol" />
      </h3>
      <div className="h-px bg-border" />
      <div className="space-y-3">
        {stages.map(({ title, text }) => (
          <div key={title}>
            <p className="text-[13px] font-semibold text-cp-paper">{title}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-cp-stone">{text}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-cp-stone">
        Evidence first <ArrowRight className="h-3 w-3 text-cp-lime" /> then apply
      </div>
    </SpotlightCard>
  );
}

/* ------------------------------------------------------------------ */
/* Presentational Flight Plan body                                     */
/*                                                                     */
/* The route (flightplan.tsx) owns the query, the loading state and    */
/* the error state; this view owns the tabs and the layout, so the     */
/* design can be proven with sample data without touching live data.   */
/* ------------------------------------------------------------------ */

export function FlightPlanView({
  report,
  roleOverride,
  onPickRole,
}: {
  report: JobMirrorReport;
  roleOverride: string | null;
  onPickRole: (roleId: string | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<FlightPlanTab>("readiness");

  return (
    <div className="space-y-6 pb-12">
      {/* HERO: the statement, the number under the light */}
      <FlightPlanHero
        roleName={report.role.displayName}
        headline={report.role.headline}
        lastResearched={report.provenance.lastResearched}
        mustHave={report.coverage.mustHave}
        expectationCount={report.skills.length}
        isFallback={report.role.isFallback}
        evidence={{
          projectCount: report.studentEvidence.projectCount,
          hasResume: report.studentEvidence.hasResume,
          demonstratedSkillCount: report.studentEvidence.demonstratedSkillCount,
          claimedOnlySkillCount: report.studentEvidence.claimedOnlySkillCount,
        }}
      />

      {/* TABS NAVIGATION BAR */}
      <div className="card-surface overflow-hidden p-2 sm:p-3">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {[
            { id: "readiness", label: "01 Target & Readiness", icon: Target },
            { id: "skills", label: "02 Skill Mirror", icon: ListChecks },
            { id: "filters", label: "03 Rejection Filters", icon: ShieldX },
            { id: "dataset", label: "04 Market Research Dataset", icon: Globe2 },
            { id: "verdict", label: "05 Fit Verdict", icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FlightPlanTab)}
                className={cn(
                  "flex min-w-[180px] shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[12.5px] font-semibold transition-all duration-200 sm:min-w-0 sm:flex-1",
                  isActive
                    ? "bg-cp-lime text-cp-ink shadow-lift"
                    : "bg-transparent text-cp-stone hover:bg-secondary hover:text-cp-paper",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENTS */}
      <AnimatePresence mode="wait">
        {activeTab === "readiness" && (
          <motion.div
            key="readiness"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.75fr)]"
          >
            <div className="space-y-6">
              <RolePicker report={report} activeRole={roleOverride} onPick={onPickRole} />
              <JobReadinessAssessment
                roleName={report.role.requested || report.role.displayName}
                hasResume={report.studentEvidence.hasResume}
              />
            </div>
            <HowItWorksCard />
          </motion.div>
        )}

        {activeTab === "skills" && (
          <motion.div
            key="skills"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SkillMirror skills={report.skills} coverage={report.coverage} />
          </motion.div>
        )}

        {activeTab === "filters" && (
          <motion.div
            key="filters"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <RejectionTruth
              whatJuniorsLack={report.whatJuniorsLack}
              rejectionReasons={report.rejectionReasons}
              evidenceHierarchy={report.evidenceHierarchy}
              evidenceEmployersTrust={report.evidenceEmployersTrust}
            />
          </motion.div>
        )}

        {activeTab === "dataset" && (
          <motion.div
            key="dataset"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PakistanContext pakistan={report.pakistan} />
          </motion.div>
        )}

        {activeTab === "verdict" && (
          <motion.div
            key="verdict"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <FitVerdict report={report} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROVENANCE FOOTER */}
      <Provenance
        version={report.provenance.version}
        lastResearched={report.provenance.lastResearched}
        note={report.provenance.note}
        staleFieldGroups={report.provenance.staleFieldGroups}
      />
    </div>
  );
}
