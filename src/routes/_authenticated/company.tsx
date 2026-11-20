/**
 * Company Intelligence, Round 3 (Cursor as Flashlight / Lens).
 *
 * Signature moments:
 * - The company card is a flashlight: at rest it shows the company
 *   identity at full brightness; moving the light across it reveals the
 *   researched hiring bar (must-have skills with real posting shares,
 *   hiring areas, research date and source). An unresearched company
 *   reveals "not researched yet" instead, never invented hiring data.
 * - The alignment coverage number sits under a Lens, like the resume
 *   score, so the match detail lights up under the cursor.
 *
 * Presentation only: every number, list and state below comes from the
 * CompanyDashboard the data layer returns. Nothing is invented here.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Search,
  ExternalLink,
  ShieldCheck,
  TriangleAlert,
  Target,
  ListChecks,
  Cpu,
  Briefcase,
  Link2,
  Sparkles,
  Globe,
  RefreshCw,
  CircleHelp,
  Flashlight as FlashlightIcon,
} from "lucide-react";

import { FEATURED_COMPANIES } from "@/data/company-truth";
import {
  useCompanyDashboard,
  useRefreshCompanyResearch,
  type CompanyDashboard,
} from "@/data/company";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/lib/animation";
import { Flashlight } from "@/components/lens/Flashlight";
import { Lens } from "@/components/lens/Lens";
import { usePrefersReducedMotion } from "@/components/lens/usePrefersReducedMotion";
import { MagneticButton } from "@/components/lens/MagneticButton";
import { SpotlightCard } from "@/components/lens/SpotlightCard";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({
    meta: [
      { title: "Company Intelligence | CareerPilot AI" },
      {
        name: "description",
        content:
          "What a specific company hires for, how its bar compares to your proof, and where to apply.",
      },
    ],
  }),
  component: CompanyPage,
});

const LAYOUT_TITLE = "Company Intelligence";
const LAYOUT_SUBTITLE =
  "Researched hiring bars per company, your evidence-backed alignment, and official application links.";

type CompanyTab = "overview" | "skills" | "alignment" | "links";

/* ------------------------------------------------------------------ */
/* Provenance primitives                                                */
/* ------------------------------------------------------------------ */

function UnverifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-medium text-amber-400">
      <TriangleAlert className="h-3 w-3" strokeWidth={2} />
      Unverified seed data, research date unknown
    </span>
  );
}

function NotResearchedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] font-medium text-cp-stone">
      <CircleHelp className="h-3 w-3" strokeWidth={2} />
      Not researched yet
    </span>
  );
}

function VerifiedBadge({ retrievedAt }: { retrievedAt: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cp-lime/30 bg-cp-lime/10 px-2.5 py-1 font-mono text-[11px] font-medium text-cp-lime">
      <ShieldCheck className="h-3 w-3" strokeWidth={2} />
      Researched
      {retrievedAt && <> · {new Date(retrievedAt).toLocaleDateString()}</>}
    </span>
  );
}

export function ProvenanceLine({ dashboard }: { dashboard: CompanyDashboard }) {
  const p = dashboard.provenance;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {p.origin === "unavailable" ? (
        <NotResearchedBadge />
      ) : p.verification === "verified" ? (
        <VerifiedBadge retrievedAt={p.retrievedAt} />
      ) : (
        <UnverifiedBadge />
      )}
      <span className="font-mono text-[11px] text-cp-stone">
        Source: {p.sourceLabel}
      </span>
      {p.fromCache && (
        <span className="font-mono text-[11px] text-cp-stone">
          · shared company cache
        </span>
      )}
    </div>
  );
}

/** "Research this company" action: forces a fresh live research run. */
function ResearchButton({
  onResearch,
  isResearching,
}: {
  onResearch: () => void;
  isResearching: boolean;
}) {
  if (isResearching) {
    return (
      <Button disabled className="rounded-xl bg-cp-lime text-cp-ink">
        <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={2} />
        Researching…
      </Button>
    );
  }
  return (
    <MagneticButton
      onClick={onResearch}
      className="inline-flex items-center gap-2 rounded-xl bg-cp-lime px-4 py-2.5 text-[13px] font-semibold text-cp-ink"
    >
      <RefreshCw className="h-4 w-4" strokeWidth={2} />
      Research this company
    </MagneticButton>
  );
}

/* ------------------------------------------------------------------ */
/* Company picker                                                       */
/* ------------------------------------------------------------------ */

export function CompanyPicker({
  active,
  onPick,
}: {
  active: string;
  onPick: (name: string) => void;
}) {
  const [input, setInput] = useState("");

  return (
    <SpotlightCard className="space-y-4 rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
      <div>
        <p className="cp-eyebrow">01 · Pick a company</p>
        <h3 className="mt-2 font-display text-xl font-bold text-cp-paper">
          Select a company
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-cp-stone">
          Pick a featured employer or type any company name. Research runs on
          demand and is shared across all users.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {FEATURED_COMPANIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.name)}
            className={cn(
              "rounded-full border px-4 py-2 font-mono text-[11.5px] font-medium transition",
              active.toLowerCase() === c.name.toLowerCase()
                ? "border-cp-lime bg-cp-lime text-cp-ink"
                : "border-white/10 text-cp-stone hover:border-cp-lime/50 hover:text-cp-paper",
            )}
          >
            {c.shortName}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) onPick(input.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cp-stone" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Or type any company name…"
            className="w-full rounded-xl border border-white/10 bg-cp-ink py-2.5 pl-10 pr-3 text-sm text-cp-paper outline-none placeholder:text-cp-stone/60 focus:border-cp-lime/60"
          />
        </div>
        <Button type="submit" className="rounded-xl bg-cp-lime text-cp-ink hover:bg-cp-lime/90">
          Research
        </Button>
      </form>
    </SpotlightCard>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard sections                                                   */
/* ------------------------------------------------------------------ */

/**
 * The hiring bar, under the light. Base layer (full brightness, so the
 * company identity is always readable): name, tagline, facts, and a
 * mono signal strip of real counts. Lit layer: the researched bar
 * itself, must-have skills with real posting shares, hiring areas, and
 * the research date and source. For a seed profile the lit layer says
 * so plainly instead.
 */
export function OverviewSection({
  dashboard,
  onResearch,
  isResearching,
}: {
  dashboard: CompanyDashboard;
  onResearch: () => void;
  isResearching: boolean;
}) {
  const c = dashboard.company;
  const mustHaves = dashboard.commonSkills.filter(
    (s) => s.importance === "must_have",
  );
  const live = dashboard.livePostings;
  const liveLine = !live.board
    ? "No live board"
    : !live.available
      ? "Live postings unavailable"
      : `${live.postings.length} open now`;

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-cp-panel">
      <div className="border-b border-white/10 px-6 pt-6 sm:px-8">
        <p className="cp-eyebrow flex items-center gap-2">
          <FlashlightIcon className="h-3.5 w-3.5 text-cp-lime" />
          The hiring bar
        </p>
        <p className="mt-2 font-serif text-[22px] italic leading-none text-cp-paper">
          Move the light to read the bar.
        </p>
        <p className="mt-2 pb-5 text-[12.5px] leading-relaxed text-cp-stone">
          The company, in the open. The bar, under the light.
        </p>
      </div>

      <Flashlight
        dimChildren={false}
        lit={
          <div className="mx-auto w-full max-w-[340px] px-6 py-6">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-cp-lime">
              {dashboard.status === "seed"
                ? "Seed profile, unverified"
                : "The hiring bar, researched"}
            </p>
            {dashboard.status === "seed" ? (
              <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-cp-paper">
                This profile comes from the static dataset: no sources and no
                research date on file. Run live research to replace it with
                verified hiring data.
              </p>
            ) : mustHaves.length === 0 && dashboard.hiringAreas.length === 0 ? (
              <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-cp-paper">
                The research returned no hiring bar detail for this company
                yet.
              </p>
            ) : (
              <>
                {mustHaves.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {mustHaves.slice(0, 4).map((s) => (
                      <li
                        key={s.skillName}
                        className="flex items-center justify-between gap-3 text-[13.5px]"
                      >
                        <span className="font-medium text-cp-paper">
                          {s.skillName}
                        </span>
                        <span className="shrink-0 font-mono text-[11.5px] text-cp-lime">
                          {s.shareOfPostings !== null
                            ? `${Math.round(s.shareOfPostings * 100)}% of postings`
                            : "in dataset"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {dashboard.hiringAreas.length > 0 && (
                  <p className="mt-4 text-[12.5px] leading-relaxed text-cp-stone">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cp-paper">
                      Hiring in{" "}
                    </span>
                    {dashboard.hiringAreas.slice(0, 3).join(" · ")}
                  </p>
                )}
              </>
            )}
            <p className="mt-5 font-mono text-[11.5px] text-cp-stone">
              Source: {dashboard.provenance.sourceLabel}
              {dashboard.provenance.retrievedAt &&
                ` · researched ${new Date(dashboard.provenance.retrievedAt).toLocaleDateString()}`}
            </p>
          </div>
        }
      >
        {/* Base layer: the company identity, always at full brightness.
            The min-height keeps the taller lit layer from clipping. */}
        <div className="flex min-h-[460px] flex-col justify-between px-6 py-6 sm:min-h-[380px] sm:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cp-lime/10 text-cp-lime">
              <Building2 className="h-6 w-6" strokeWidth={1.7} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-cp-paper sm:text-4xl">
                {c.displayName}
              </h2>
              {c.tagline && (
                <p className="mt-2 font-serif text-[17px] italic leading-relaxed text-cp-stone">
                  {c.tagline}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {c.category && (
                  <span className="cp-chip text-cp-stone">{c.category}</span>
                )}
                {c.location && (
                  <span className="cp-chip text-cp-stone">{c.location}</span>
                )}
                {c.tier && (
                  <span className="cp-chip text-cp-stone">{c.tier}</span>
                )}
              </div>
            </div>
          </div>
          <p className="mt-8 border-t border-white/10 pt-4 font-mono text-[11.5px] leading-relaxed text-cp-stone">
            {mustHaves.length} must-have skills · {dashboard.hiringAreas.length}{" "}
            hiring areas · {liveLine}
          </p>
        </div>
      </Flashlight>

      <div className="space-y-4 border-t border-white/10 px-6 py-5 sm:px-8">
        <ProvenanceLine dashboard={dashboard} />
        {dashboard.provenance.sourceReviewNote && (
          <p className="text-[11.5px] leading-5 text-amber-400">
            Source review: {dashboard.provenance.sourceReviewNote}
          </p>
        )}
        {dashboard.status === "seed" && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="flex-1 text-xs leading-relaxed text-cp-stone">
              This profile comes from the static dataset: no sources and no
              research date on file. Run live research to replace it with
              verified hiring data.
            </p>
            <ResearchButton
              onResearch={onResearch}
              isResearching={isResearching}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Live ATS postings for companies with a verified job board. */
export function LivePostingsSection({
  dashboard,
}: {
  dashboard: CompanyDashboard;
}) {
  const live = dashboard.livePostings;
  if (!live.board) return null;
  const providerLabel =
    live.board.provider === "greenhouse"
      ? "Greenhouse"
      : live.board.provider === "lever"
        ? "Lever"
        : "Ashby";
  return (
    <SpotlightCard className="space-y-3 rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-cp-paper">
        <Globe className="h-5 w-5 text-cp-lime" strokeWidth={1.7} />
        Live postings
        {live.available && (
          <span className="rounded-full border border-cp-lime/30 bg-cp-lime/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-cp-lime">
            {live.postings.length} open now
          </span>
        )}
      </h3>
      {!live.available ? (
        <p className="text-sm leading-relaxed text-cp-stone">
          Live postings unavailable right now.
          {live.error && (
            <span className="text-cp-stone"> {live.error}</span>
          )}
        </p>
      ) : live.postings.length === 0 ? (
        <p className="text-sm leading-relaxed text-cp-stone">
          This company has no open roles on its {providerLabel} board right
          now. Checked{" "}
          {live.retrievedAt
            ? new Date(live.retrievedAt).toLocaleDateString()
            : "just now"}
          .
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {live.postings.slice(0, 10).map((p) => (
              <li
                key={p.externalId ?? p.url ?? p.title}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-cp-ink px-4 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-cp-paper">
                    {p.title}
                  </span>
                  <span className="block font-mono text-[11px] text-cp-stone">
                    {[p.city, p.country].filter(Boolean).join(", ") ||
                      "Location not listed"}
                    {p.remoteType !== "unknown" && ` · ${p.remoteType}`}
                  </span>
                </span>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cp-lime underline decoration-dotted underline-offset-2 hover:text-cp-paper"
                  >
                    Apply
                    <ExternalLink className="h-3 w-3" strokeWidth={1.7} />
                  </a>
                )}
              </li>
            ))}
          </ul>
          <p className="font-mono text-[11px] text-cp-stone">
            Source: {providerLabel} job board
            {live.retrievedAt &&
              ` · checked ${new Date(live.retrievedAt).toLocaleString()}`}
            {live.boardUrl && (
              <>
                {" · "}
                <a
                  href={live.boardUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline decoration-dotted underline-offset-2 hover:text-cp-lime"
                >
                  view all {live.postings.length} on {providerLabel}
                </a>
              </>
            )}
          </p>
        </>
      )}
    </SpotlightCard>
  );
}

/**
 * Typed "not researched yet" state, a real UI state, not an error. The
 * flashlight is the honesty device here: the light reveals that there
 * is nothing to reveal yet, and what research would do.
 */
export function NotResearchedSection({
  dashboard,
  onResearch,
  isResearching,
}: {
  dashboard: CompanyDashboard;
  onResearch: () => void;
  isResearching: boolean;
}) {
  const c = dashboard.company;
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-cp-panel">
      <div className="border-b border-white/10 px-6 pt-6 sm:px-8">
        <p className="cp-eyebrow flex items-center gap-2">
          <FlashlightIcon className="h-3.5 w-3.5 text-cp-lime" />
          The hiring bar
        </p>
        <p className="mt-2 pb-5 font-serif text-[22px] italic leading-none text-cp-paper">
          Nothing under the light yet.
        </p>
      </div>

      <Flashlight
        dimChildren={false}
        lit={
          <div className="mx-auto w-full max-w-[340px] px-6 py-6">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-cp-lime">
              Not researched yet
            </p>
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-cp-paper">
              No researched hiring profile exists for this company yet, and
              CareerPilot does not invent one. Research runs live from the
              company&apos;s public careers surface
              {c.atsBoard
                ? " (its public job board)"
                : " (its careers pages)"}
              , and the result is shared across all users.
            </p>
            {dashboard.researchError && (
              <p className="mt-3 font-mono text-[11.5px] leading-5 text-cp-stone">
                Last research attempt: {dashboard.researchError}
              </p>
            )}
          </div>
        }
      >
        <div className="flex min-h-[300px] flex-col justify-between px-6 py-6 sm:min-h-[260px] sm:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-cp-stone">
              <CircleHelp className="h-6 w-6" strokeWidth={1.7} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-cp-paper sm:text-4xl">
                {c.displayName}
              </h2>
              <p className="mt-2 font-serif text-[17px] italic leading-relaxed text-cp-stone">
                No researched hiring profile exists for this company yet.
              </p>
            </div>
          </div>
          <p className="mt-8 border-t border-white/10 pt-4 font-mono text-[11.5px] leading-relaxed text-cp-stone">
            Status: not researched · Research: on demand, shared across all
            users
          </p>
        </div>
      </Flashlight>

      <div className="space-y-4 border-t border-white/10 px-6 py-5 sm:px-8">
        <ProvenanceLine dashboard={dashboard} />
        <div>
          <ResearchButton
            onResearch={onResearch}
            isResearching={isResearching}
          />
        </div>
      </div>
    </div>
  );
}

export function HiringAreasSection({
  dashboard,
}: {
  dashboard: CompanyDashboard;
}) {
  if (dashboard.hiringAreas.length === 0) return null;
  return (
    <SpotlightCard className="space-y-3 rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-cp-paper">
        <Briefcase className="h-5 w-5 text-cp-lime" strokeWidth={1.7} />
        Hiring areas
      </h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {dashboard.hiringAreas.map((area) => (
          <li
            key={area}
            className="rounded-2xl border border-white/10 bg-cp-ink px-4 py-2.5 text-sm text-cp-paper"
          >
            {area}
          </li>
        ))}
      </ul>
      <ProvenanceLine dashboard={dashboard} />
    </SpotlightCard>
  );
}

export function SkillsSection({ dashboard }: { dashboard: CompanyDashboard }) {
  const skills = dashboard.commonSkills.slice(0, 15);
  if (skills.length === 0) return null;
  return (
    <SpotlightCard className="space-y-3 rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-cp-paper">
        <ListChecks className="h-5 w-5 text-cp-lime" strokeWidth={1.7} />
        Common skills
      </h3>
      <p className="text-xs text-cp-stone">
        Requirement frequency observed for this company. Real counts, not
        estimates.
      </p>
      <ul className="space-y-2">
        {skills.map((s) => (
          <li
            key={s.skillName}
            className="rounded-2xl border border-white/10 bg-cp-ink px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-cp-paper">
                {s.skillName}
              </span>
              <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-cp-stone">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-semibold",
                    s.importance === "must_have"
                      ? "bg-cp-lime/10 text-cp-lime"
                      : "bg-white/5 text-cp-stone",
                  )}
                >
                  {s.importance === "must_have" ? "Must-have" : "Preferred"}
                </span>
                {s.shareOfPostings !== null ? (
                  <span>{Math.round(s.shareOfPostings * 100)}% of postings</span>
                ) : (
                  <span>in dataset</span>
                )}
              </span>
            </div>
            {s.shareOfPostings !== null && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cp-lime"
                  style={{ width: `${Math.round(s.shareOfPostings * 100)}%` }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      <ProvenanceLine dashboard={dashboard} />
    </SpotlightCard>
  );
}

export function TechSignalsSection({
  dashboard,
}: {
  dashboard: CompanyDashboard;
}) {
  if (dashboard.techSignals.length === 0) return null;
  return (
    <SpotlightCard className="space-y-3 rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-cp-paper">
        <Cpu className="h-5 w-5 text-cp-lime" strokeWidth={1.7} />
        Tech signals
      </h3>
      <div className="flex flex-wrap gap-2">
        {dashboard.techSignals.map((t) => (
          <span
            key={t}
            className="rounded-full border border-white/10 bg-cp-ink px-3.5 py-1.5 font-mono text-[11.5px] text-cp-paper"
          >
            {t}
          </span>
        ))}
      </div>
      <ProvenanceLine dashboard={dashboard} />
    </SpotlightCard>
  );
}

export function AlignmentSection({
  dashboard,
}: {
  dashboard: CompanyDashboard;
}) {
  const alignment = dashboard.alignment;
  const reduced = usePrefersReducedMotion();
  return (
    <SpotlightCard className="space-y-4 rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-cp-paper">
        <Target className="h-5 w-5 text-cp-lime" strokeWidth={1.7} />
        Your alignment &amp; gaps
      </h3>
      {dashboard.alignmentNote && !alignment && (
        <p className="text-sm leading-relaxed text-cp-stone">
          {dashboard.alignmentNote}
        </p>
      )}
      {alignment && (
        <>
          <div className="flex items-center gap-5">
            <div data-proof="coverage-number" className="shrink-0">
              <Lens>
                <div className="font-display text-[64px] font-extrabold leading-none tracking-tight text-cp-lime sm:text-[72px]">
                  {alignment.coveragePct}
                  <span className="text-lg text-cp-stone">%</span>
                </div>
              </Lens>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-cp-stone">
              Evidence-weighted coverage of this company&apos;s requirements,
              scored deterministically from your evidence ledger.
              {reduced ? "The number is shown in full." : "Put the light over the number to see it lit."}
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cp-lime"
              style={{ width: `${alignment.coveragePct}%` }}
            />
          </div>
          <p className="font-mono text-[11.5px] text-cp-stone">
            Must-have: {alignment.mustHave.proven} of {alignment.mustHave.total}{" "}
            proven · Preferred: {alignment.preferred.proven} of{" "}
            {alignment.preferred.total} proven
          </p>
          {alignment.criticalGaps.length > 0 && (
            <div className="rounded-2xl border border-cp-ember/30 bg-cp-ember/5 p-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-cp-ember">
                Critical gaps: must-have, no evidence
              </p>
              <ul className="mt-2 space-y-1">
                {alignment.criticalGaps.map((g) => (
                  <li key={g.skill} className="text-sm text-cp-paper">
                    {g.skill}{" "}
                    <span className="text-cp-stone">({g.reason})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="space-y-1.5">
            {alignment.classifications.slice(0, 10).map((c) => (
              <li
                key={c.skill}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-cp-paper">{c.skill}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium",
                    c.level === "PROVEN" &&
                      "bg-cp-lime/10 text-cp-lime",
                    c.level === "MISSING" && "bg-red-500/10 text-red-400",
                    !["PROVEN", "MISSING"].includes(c.level) &&
                      "bg-white/5 text-cp-stone",
                  )}
                >
                  {c.level.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {dashboard.bestProjects.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="flex items-center gap-2 text-sm font-bold text-cp-paper">
            <Sparkles className="h-4 w-4 text-cp-lime" strokeWidth={1.7} />
            Your best proof for this company
          </h4>
          <ul className="space-y-2">
            {dashboard.bestProjects.map((p, i) => (
              <li
                key={`${p.skillKey}-${i}`}
                className="rounded-2xl border border-white/10 bg-cp-ink px-4 py-3"
              >
                <p className="text-sm text-cp-paper">{p.claim}</p>
                <p className="mt-1 font-mono text-[11px] text-cp-stone">
                  {p.skillKey} · evidence strength {p.strength}/3
                  {p.sourceUrl && (
                    <>
                      {" · "}
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline decoration-dotted underline-offset-2 hover:text-cp-lime"
                      >
                        source
                      </a>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SpotlightCard>
  );
}

export function JobLinksSection({
  dashboard,
}: {
  dashboard: CompanyDashboard;
}) {
  if (dashboard.jobLinks.length === 0) return null;
  return (
    <SpotlightCard className="space-y-3 rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-cp-paper">
        <Link2 className="h-5 w-5 text-cp-lime" strokeWidth={1.7} />
        Official job links
      </h3>
      <ul className="space-y-2">
        {dashboard.jobLinks.map((j) => (
          <li
            key={j.url}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-cp-ink px-4 py-2.5"
          >
            <a
              href={j.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-cp-paper underline decoration-dotted underline-offset-2 hover:text-cp-lime"
            >
              <span className="truncate">{j.label}</span>
              <ExternalLink
                className="h-3.5 w-3.5 shrink-0"
                strokeWidth={1.7}
              />
            </a>
            <span className="shrink-0 font-mono text-[11px] text-cp-stone">
              {j.retrievedAt
                ? `retrieved ${new Date(j.retrievedAt).toLocaleDateString()}`
                : ""}
            </span>
          </li>
        ))}
      </ul>
    </SpotlightCard>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

const TABS: { id: CompanyTab; label: string }[] = [
  { id: "overview", label: "01 Overview" },
  { id: "skills", label: "02 Skills & Signals" },
  { id: "alignment", label: "03 Your Alignment" },
  { id: "links", label: "04 Job Links" },
];

function CompanyPage() {
  const [companyName, setCompanyName] = useState<string>(
    FEATURED_COMPANIES[0]!.name,
  );
  const [activeTab, setActiveTab] = useState<CompanyTab>("overview");
  const {
    data: dashboard,
    isLoading,
    error,
  } = useCompanyDashboard(companyName);
  const refreshMutation = useRefreshCompanyResearch(companyName);
  const handleResearch = () => refreshMutation.mutate();

  return (
    <AppLayout title={LAYOUT_TITLE} subtitle={LAYOUT_SUBTITLE}>
      <div className="space-y-6 pb-12">
        <CompanyPicker active={companyName} onPick={setCompanyName} />

        {isLoading && (
          <div className="space-y-3 rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-cp-ember/30 bg-cp-ember/5 p-6 sm:p-8">
            <p className="text-sm font-semibold text-cp-paper">
              Company data couldn&apos;t be loaded.
            </p>
            <p className="mt-1 text-xs text-cp-stone">
              {error instanceof Error ? error.message : "Please try again."}
            </p>
          </div>
        )}

        {dashboard && dashboard.status === "not_researched" && (
          <div className="space-y-6">
            <NotResearchedSection
              dashboard={dashboard}
              onResearch={handleResearch}
              isResearching={refreshMutation.isPending}
            />
            <LivePostingsSection dashboard={dashboard} />
          </div>
        )}

        {dashboard && dashboard.status !== "not_researched" && (
          <>
            <div className="rounded-3xl border border-white/10 bg-cp-panel p-2 sm:p-3">
              <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 font-mono text-[12px] font-medium transition-all duration-200",
                      activeTab === tab.id
                        ? "bg-cp-lime text-cp-ink"
                        : "bg-transparent text-cp-stone hover:bg-white/5 hover:text-cp-paper",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "overview" && (
              <div className="space-y-6">
                <OverviewSection
                  dashboard={dashboard}
                  onResearch={handleResearch}
                  isResearching={refreshMutation.isPending}
                />
                <LivePostingsSection dashboard={dashboard} />
                <HiringAreasSection dashboard={dashboard} />
              </div>
            )}
            {activeTab === "skills" && (
              <div className="space-y-6">
                <SkillsSection dashboard={dashboard} />
                <TechSignalsSection dashboard={dashboard} />
              </div>
            )}
            {activeTab === "alignment" && (
              <AlignmentSection dashboard={dashboard} />
            )}
            {activeTab === "links" && <JobLinksSection dashboard={dashboard} />}
          </>
        )}
      </div>
    </AppLayout>
  );
}
