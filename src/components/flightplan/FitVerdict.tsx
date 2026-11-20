import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Banknote,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderGit2,
  Hammer,
  Quote,
  Sparkles,
  XCircle,
} from "lucide-react";

import type {
  JobMirrorReport,
  MirrorPersonalization,
  MirrorSalaryBand,
  MirrorSkill,
  MirrorTruth,
  TierCoverage,
} from "@/lib/jobmirror.server";
import { cn } from "@/lib/utils";
import { KineticText } from "@/components/lens/KineticText";
import { Lens } from "@/components/lens/Lens";
import { MagneticButton } from "@/components/lens/MagneticButton";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import { Cite } from "./MarketTruthNote";

/** Keep the source value intact instead of rounding small bands into K. */
function formatBand(band: MirrorSalaryBand): string {
  const amount = (value: number) => new Intl.NumberFormat("en-US").format(value);
  const money =
    band.currency === "PKR"
      ? `PKR ${amount(band.min)}–${amount(band.max)}`
      : `$${amount(band.min)}–${amount(band.max)}`;
  return `${money} /${band.period === "month" ? "mo" : "yr"}`;
}

/** The honest headline: proven non-negotiables out of the total. */
function Verdict({
  coverage,
  personalized,
  studentEvidence,
  missingMustHaves,
}: {
  coverage: TierCoverage;
  personalized: MirrorPersonalization | null;
  studentEvidence: JobMirrorReport["studentEvidence"];
  missingMustHaves: MirrorSkill[];
}) {
  const noEvidence = !studentEvidence.hasResume && studentEvidence.projectCount === 0;

  return (
    <SpotlightCard className="card-surface p-6 sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cp-lime/10 text-cp-lime">
        <Sparkles className="h-5 w-5" strokeWidth={1.7} />
      </div>

      <p className="cp-eyebrow mt-6 text-cp-lime">Where you actually stand</p>
      {/* The verdict number sits under the lens: static text only, no
          interactive elements inside, per the engine's contract. */}
      <Lens magnify={1.5}>
        <p className="mt-3 font-display text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-tight text-cp-paper">
          {coverage.covered} of {coverage.total} non-negotiables proven
        </p>
      </Lens>

      {noEvidence ? (
        <p className="mt-4 text-sm leading-7 text-cp-stone">
          You have no resume and no projects on record. Every skill you hold is currently an
          unverified claim, so this mirror can only show you the gap, not your strengths.
        </p>
      ) : (
        <p className="mt-4 text-sm leading-7 text-cp-stone">
          Counted from your own records: {studentEvidence.projectCount} project(s),{" "}
          {studentEvidence.hasResume ? "a resume on file" : "no resume on file"},{" "}
          {studentEvidence.demonstratedSkillCount} skill(s) with project or GitHub proof and{" "}
          {studentEvidence.claimedOnlySkillCount} claimed without proof.
        </p>
      )}

      {personalized && (
        <div className="mt-6 space-y-4 rounded-2xl bg-white/[0.04] p-5">
          <div className="flex items-start gap-2.5">
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-cp-lime" strokeWidth={1.9} />
            <div className="min-w-0 space-y-3">
              {personalized.verdict && (
                <p className="text-sm font-medium leading-6 text-cp-paper">
                  {personalized.verdict}
                </p>
              )}
              {personalized.brutalTruth && (
                <p className="font-serif text-[15px] italic leading-6 text-cp-stone">
                  {personalized.brutalTruth}
                </p>
              )}
            </div>
          </div>
          {personalized.buildNext && (
            <Link
              to="/roadmap"
              className="flex items-start gap-2.5 border-t border-border pt-4 transition-colors hover:text-cp-lime"
            >
              <Hammer className="mt-0.5 h-4 w-4 shrink-0 text-cp-lime" strokeWidth={1.9} />
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cp-stone">
                  Build this next · Open Roadmap
                </p>
                <p className="mt-1.5 text-sm leading-6 text-cp-paper">{personalized.buildNext}</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {missingMustHaves.length > 0 && (
        <div className="mt-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cp-stone">
            Non-negotiables you cannot yet prove
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {missingMustHaves.map((skill) => (
              <span
                className="rounded-full bg-cp-ember/10 px-3 py-1.5 text-xs font-medium text-cp-ember"
                key={skill.skill}
              >
                {skill.skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </SpotlightCard>
  );
}

/** Real, cited salary bands. Never a single fabricated "expected salary". */
function SalaryBands({ bands }: { bands: MirrorSalaryBand[] }) {
  if (bands.length === 0) return null;

  return (
    <SpotlightCard className="card-surface p-6 sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cp-lime/10 text-cp-lime">
        <Banknote className="h-5 w-5" strokeWidth={1.7} />
      </div>
      <h3 className="mt-6 font-display text-lg font-semibold text-cp-paper">
        <KineticText text="What this role actually pays" />
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-cp-stone">
        Junior bands as reported by the sources below, not a prediction of your offer.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {bands.map((band, index) => (
          <motion.div
            key={band.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
            className="rounded-2xl bg-white/[0.04] p-5"
          >
            <p className="font-display text-lg font-semibold leading-none text-cp-paper">
              {formatBand(band)}
            </p>
            <p className="mt-2 text-xs font-medium text-cp-paper">{band.label}</p>
            {band.note && (
              <p className="mt-1 text-[11px] leading-5 text-cp-stone">{band.note}</p>
            )}
            <div className="mt-1.5">
              <Cite citation={band.citation} />
            </div>
          </motion.div>
        ))}
      </div>
    </SpotlightCard>
  );
}

function CvReadinessCard({ report }: { report: JobMirrorReport }) {
  const demonstrated = report.cvReadiness.filter((item) => item.status === "demonstrated");
  const claimed = report.cvReadiness.filter((item) => item.status === "claimed");
  const missing = report.cvReadiness.filter((item) => item.status === "missing");

  return (
    <SpotlightCard className="card-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cp-lime/10 text-cp-lime">
            <FileText className="h-5 w-5" strokeWidth={1.7} />
          </div>
          <p className="cp-eyebrow mt-6 text-cp-lime">CV readiness for this role</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-cp-paper">
            {report.role.displayName}: {demonstrated.length} of {report.cvReadiness.length}{" "}
            non-negotiables proven
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cp-stone">
            This is an evidence check, not another resume score. A CV mention is useful, but only a
            project or GitHub repository counts as demonstrated proof.
          </p>
        </div>
        <div className="rounded-2xl bg-white/[0.04] px-4 py-3 text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cp-stone">
            Resume signal
          </p>
          <p className="mt-1 text-lg font-semibold text-cp-paper">
            {report.studentEvidence.resumeDetectedSkillCount} skills detected
          </p>
          <p className="mt-1 text-[11px] text-cp-stone">
            {report.studentEvidence.githubRepositoryCount} GitHub{" "}
            {report.studentEvidence.githubRepositoryCount === 1 ? "repo" : "repos"} linked
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {report.cvReadiness.map((item) => {
          const Icon =
            item.status === "demonstrated"
              ? CheckCircle2
              : item.status === "claimed"
                ? AlertTriangle
                : XCircle;
          const detail =
            item.status === "demonstrated"
              ? item.githubProof
                ? "GitHub proof"
                : "Project proof"
              : item.status === "claimed"
                ? item.cvMentioned
                  ? "Mentioned in CV, not proven"
                  : "Recorded claim, not proven"
                : "Missing from CV and proof";
          return (
            <div
              key={item.skill}
              className="flex items-start gap-2.5 rounded-xl border border-border px-3 py-2.5"
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  item.status === "demonstrated"
                    ? "text-cp-lime"
                    : item.status === "claimed"
                      ? "text-cp-ember"
                      : "text-cp-stone",
                )}
              />
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-cp-paper">{item.skill}</p>
                <p className="mt-0.5 text-[11px] text-cp-stone">{detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {missing.length > 0 || claimed.length > 0 ? (
        <div className="mt-6 rounded-2xl bg-cp-ember/5 p-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cp-ember">
            Fix first
          </p>
          <p className="mt-1.5 text-sm leading-6 text-cp-paper">
            {missing[0]?.skill ?? claimed[0]?.skill} is the first requirement to address before
            applying for this role.
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <MagneticButton
          href="/resume"
          className="inline-flex items-center gap-2 rounded-xl bg-cp-lime px-4 py-2.5 text-xs font-semibold text-cp-ink"
        >
          Improve my CV
          <ExternalLink className="h-3.5 w-3.5" />
        </MagneticButton>
        <Link
          to="/roadmap"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-cp-paper transition-colors hover:bg-muted/40"
        >
          Build the missing proof
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <Link
          to="/recruiter"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-cp-paper transition-colors hover:bg-muted/40"
        >
          Check a company
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        {report.studentEvidence.githubRepositories.map((url) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-cp-paper transition-colors hover:bg-muted/40"
          >
            Open GitHub proof
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ))}
      </div>
    </SpotlightCard>
  );
}

/** Portfolio bar the market sets for entry level. */
function PortfolioBar({
  typicalExperience,
  items,
}: {
  typicalExperience: string | null;
  items: MirrorTruth[];
}) {
  if (items.length === 0 && !typicalExperience) return null;

  return (
    <SpotlightCard className="card-surface p-6 sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cp-lime/10 text-cp-lime">
        <FolderGit2 className="h-5 w-5" strokeWidth={1.7} />
      </div>
      <h3 className="mt-6 font-display text-lg font-semibold text-cp-paper">
        <KineticText text="The portfolio bar" />
      </h3>
      {typicalExperience && (
        <p className="mt-1.5 text-sm leading-6 text-cp-stone">
          Treated as true entry level: {typicalExperience}.
        </p>
      )}
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li className="flex gap-3" key={item.statement}>
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
            <div className="min-w-0">
              <p className="text-sm leading-6 text-cp-paper">{item.statement}</p>
              <Cite citation={item.citation} />
            </div>
          </li>
        ))}
      </ul>
    </SpotlightCard>
  );
}

/** What AI already took, and what still earns a junior a seat. */
function AiImpact({ aiImpact }: { aiImpact: JobMirrorReport["aiImpact"] }) {
  return (
    <SpotlightCard className="card-surface p-6 sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cp-lime/10 text-cp-lime">
        <Bot className="h-5 w-5" strokeWidth={1.7} />
      </div>
      <h3 className="mt-6 font-display text-lg font-semibold text-cp-paper">
        <KineticText text="What AI changed about this role" />
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-cp-stone">{aiImpact.stabilityNote}</p>

      {aiImpact.automatedByAi.length > 0 && (
        <div className="mt-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cp-stone">
            Already automated: stop selling this
          </p>
          <ul className="mt-3 space-y-2.5">
            {aiImpact.automatedByAi.map((item) => (
              <li className="flex gap-3" key={item.statement}>
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cp-stone/50" />
                <div className="min-w-0">
                  <p className="text-sm leading-6 text-cp-stone">{item.statement}</p>
                  <Cite citation={item.citation} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {aiImpact.stillValued.length > 0 && (
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cp-stone">
              Still valued
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {aiImpact.stillValued.map((entry) => (
                <span
                  className="rounded-full bg-cp-lime/10 px-3 py-1.5 text-xs font-medium text-cp-lime"
                  key={entry}
                >
                  {entry}
                </span>
              ))}
            </div>
          </div>
        )}
        {aiImpact.emergingSkills.length > 0 && (
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cp-stone">
              Growing fast enough to differentiate
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {aiImpact.emergingSkills.map((entry) => (
                <span
                  className="rounded-full bg-cp-ember/10 px-3 py-1.5 text-xs font-medium text-cp-ember"
                  key={entry}
                >
                  {entry}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {aiImpact.notes.length > 0 && (
        <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
          {aiImpact.notes.map((note) => (
            <li key={note.statement}>
              <p className="text-xs leading-6 text-cp-stone">{note.statement}</p>
              <Cite citation={note.citation} />
            </li>
          ))}
        </ul>
      )}
    </SpotlightCard>
  );
}

/**
 * Step 4, Round 3: the student's standing, the real pay bands, the
 * portfolio bar and the AI reality. Numbers come from the dataset;
 * only the verdict prose is model-written, and it is optional.
 */
export function FitVerdict({ report }: { report: JobMirrorReport }) {
  const missingMustHaves = report.skills.filter(
    (skill) => skill.tier === "must-have" && skill.status !== "demonstrated",
  );

  return (
    <div className="space-y-6">
      <Verdict
        coverage={report.coverage.mustHave}
        personalized={report.personalized}
        studentEvidence={report.studentEvidence}
        missingMustHaves={missingMustHaves}
      />
      <CvReadinessCard report={report} />
      <PortfolioBar
        typicalExperience={report.portfolio.typicalExperience}
        items={report.portfolio.items}
      />
      <SalaryBands bands={report.salaryBands} />
      <AiImpact aiImpact={report.aiImpact} />
    </div>
  );
}
