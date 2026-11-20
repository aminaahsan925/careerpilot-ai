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
} from "lucide-react";

import { FEATURED_COMPANIES } from "@/data/company-truth";
import { useCompanyDashboard, type CompanyDashboard } from "@/data/company";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/lib/animation";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({
    meta: [
      { title: "Company Intelligence — CareerPilot AI" },
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
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <TriangleAlert className="h-3 w-3" strokeWidth={2} />
      Unverified — static dataset, no cited source
    </span>
  );
}

function VerifiedBadge({ retrievedAt }: { retrievedAt: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
      <ShieldCheck className="h-3 w-3" strokeWidth={2} />
      Researched · {new Date(retrievedAt).toLocaleDateString()}
    </span>
  );
}

function ProvenanceLine({ dashboard }: { dashboard: CompanyDashboard }) {
  const p = dashboard.provenance;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {p.verification === "verified" ? (
        <VerifiedBadge retrievedAt={p.retrievedAt} />
      ) : (
        <UnverifiedBadge />
      )}
      <span className="text-[11px] text-muted-foreground">
        Source: {p.sourceLabel}
      </span>
      {p.fromCache && (
        <span className="text-[11px] text-muted-foreground">
          · shared company cache
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Company picker                                                       */
/* ------------------------------------------------------------------ */

function CompanyPicker({
  active,
  onPick,
}: {
  active: string;
  onPick: (name: string) => void;
}) {
  const [input, setInput] = useState("");

  return (
    <div className="card-surface space-y-4 p-6 sm:p-8">
      <div>
        <h3 className="font-display text-lg font-bold text-foreground">
          Select a company
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Pick a featured employer or type any company name — research runs on
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
              "rounded-xl border px-4 py-2 text-xs font-semibold transition",
              active.toLowerCase() === c.name.toLowerCase()
                ? "border-terracotta/60 bg-terracotta/10 text-terracotta"
                : "border-border text-muted-foreground hover:border-terracotta/40 hover:text-foreground",
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Or type any company name…"
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:border-terracotta/60"
          />
        </div>
        <Button type="submit">Research</Button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard sections                                                   */
/* ------------------------------------------------------------------ */

function OverviewSection({ dashboard }: { dashboard: CompanyDashboard }) {
  const c = dashboard.company;
  return (
    <div className="card-surface space-y-4 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta">
          <Building2 className="h-6 w-6" strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold text-foreground">
            {c.displayName}
          </h2>
          {c.tagline && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {c.tagline}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {c.category && (
              <span className="rounded-full bg-secondary px-2.5 py-1">
                {c.category}
              </span>
            )}
            {c.location && (
              <span className="rounded-full bg-secondary px-2.5 py-1">
                {c.location}
              </span>
            )}
            {c.tier && (
              <span className="rounded-full bg-secondary px-2.5 py-1">
                {c.tier}
              </span>
            )}
          </div>
        </div>
      </div>
      <ProvenanceLine dashboard={dashboard} />
      {dashboard.provenance.sourceReviewNote && (
        <p className="text-[11px] leading-5 text-amber-700">
          Source review: {dashboard.provenance.sourceReviewNote}
        </p>
      )}
    </div>
  );
}

function HiringAreasSection({ dashboard }: { dashboard: CompanyDashboard }) {
  if (dashboard.hiringAreas.length === 0) return null;
  return (
    <div className="card-surface space-y-3 p-6 sm:p-8">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
        <Briefcase className="h-5 w-5 text-terracotta" strokeWidth={1.7} />
        Hiring areas
      </h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {dashboard.hiringAreas.map((area) => (
          <li
            key={area}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground"
          >
            {area}
          </li>
        ))}
      </ul>
      <ProvenanceLine dashboard={dashboard} />
    </div>
  );
}

function SkillsSection({ dashboard }: { dashboard: CompanyDashboard }) {
  const skills = dashboard.commonSkills.slice(0, 15);
  if (skills.length === 0) return null;
  return (
    <div className="card-surface space-y-3 p-6 sm:p-8">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
        <ListChecks className="h-5 w-5 text-terracotta" strokeWidth={1.7} />
        Common skills
      </h3>
      <p className="text-xs text-muted-foreground">
        Requirement frequency observed for this company — real counts, not
        estimates.
      </p>
      <ul className="space-y-2">
        {skills.map((s) => (
          <li
            key={s.skillName}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2.5"
          >
            <span className="text-sm font-medium text-foreground">
              {s.skillName}
            </span>
            <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-semibold",
                  s.importance === "must_have"
                    ? "bg-terracotta/10 text-terracotta"
                    : "bg-secondary text-muted-foreground",
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
          </li>
        ))}
      </ul>
      <ProvenanceLine dashboard={dashboard} />
    </div>
  );
}

function TechSignalsSection({ dashboard }: { dashboard: CompanyDashboard }) {
  if (dashboard.techSignals.length === 0) return null;
  return (
    <div className="card-surface space-y-3 p-6 sm:p-8">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
        <Cpu className="h-5 w-5 text-terracotta" strokeWidth={1.7} />
        Tech signals
      </h3>
      <div className="flex flex-wrap gap-2">
        {dashboard.techSignals.map((t) => (
          <span
            key={t}
            className="rounded-xl border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground"
          >
            {t}
          </span>
        ))}
      </div>
      <ProvenanceLine dashboard={dashboard} />
    </div>
  );
}

function AlignmentSection({ dashboard }: { dashboard: CompanyDashboard }) {
  const alignment = dashboard.alignment;
  return (
    <div className="card-surface space-y-4 p-6 sm:p-8">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
        <Target className="h-5 w-5 text-terracotta" strokeWidth={1.7} />
        Your alignment & gaps
      </h3>
      {dashboard.alignmentNote && !alignment && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {dashboard.alignmentNote}
        </p>
      )}
      {alignment && (
        <>
          <div className="flex items-center gap-4">
            <div className="font-display text-4xl font-bold text-foreground">
              {alignment.coveragePct}
              <span className="text-lg text-muted-foreground">%</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Evidence-weighted coverage of this company's requirements, scored
              deterministically from your evidence ledger.
            </p>
          </div>
          {alignment.criticalGaps.length > 0 && (
            <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-terracotta">
                Critical gaps — must-have, no evidence
              </p>
              <ul className="mt-2 space-y-1">
                {alignment.criticalGaps.map((g) => (
                  <li key={g.skill} className="text-sm text-foreground">
                    {g.skill}{" "}
                    <span className="text-muted-foreground">— {g.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="space-y-1.5">
            {alignment.classifications.slice(0, 10).map((c) => (
              <li
                key={c.skill}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-foreground">{c.skill}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    c.level === "PROVEN" &&
                      "bg-emerald-500/10 text-emerald-700",
                    c.level === "MISSING" && "bg-red-500/10 text-red-700",
                    !["PROVEN", "MISSING"].includes(c.level) &&
                      "bg-secondary text-muted-foreground",
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
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Sparkles className="h-4 w-4 text-terracotta" strokeWidth={1.7} />
            Your best proof for this company
          </h4>
          <ul className="space-y-2">
            {dashboard.bestProjects.map((p, i) => (
              <li
                key={`${p.skillKey}-${i}`}
                className="rounded-xl border border-border bg-background px-4 py-3"
              >
                <p className="text-sm text-foreground">{p.claim}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {p.skillKey} · evidence strength {p.strength}/3
                  {p.sourceUrl && (
                    <>
                      {" · "}
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline decoration-dotted underline-offset-2 hover:text-terracotta"
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
    </div>
  );
}

function JobLinksSection({ dashboard }: { dashboard: CompanyDashboard }) {
  if (dashboard.jobLinks.length === 0) return null;
  return (
    <div className="card-surface space-y-3 p-6 sm:p-8">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
        <Link2 className="h-5 w-5 text-terracotta" strokeWidth={1.7} />
        Official job links
      </h3>
      <ul className="space-y-2">
        {dashboard.jobLinks.map((j) => (
          <li
            key={j.url}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2.5"
          >
            <a
              href={j.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground underline decoration-dotted underline-offset-2 hover:text-terracotta"
            >
              <span className="truncate">{j.label}</span>
              <ExternalLink
                className="h-3.5 w-3.5 shrink-0"
                strokeWidth={1.7}
              />
            </a>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              retrieved {new Date(j.retrievedAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
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

  return (
    <AppLayout title={LAYOUT_TITLE} subtitle={LAYOUT_SUBTITLE}>
      <div className="space-y-6 pb-12">
        <CompanyPicker active={companyName} onPick={setCompanyName} />

        {isLoading && (
          <div className="card-surface space-y-3 p-6 sm:p-8">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}

        {error && (
          <div className="card-surface p-6 sm:p-8">
            <p className="text-sm font-semibold text-foreground">
              Company data couldn't be loaded.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Please try again."}
            </p>
          </div>
        )}

        {dashboard && (
          <>
            <div className="card-surface p-2 sm:p-3">
              <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[12.5px] font-semibold transition-all duration-200",
                      activeTab === tab.id
                        ? "bg-terracotta text-white shadow-lift"
                        : "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "overview" && (
              <div className="space-y-6">
                <OverviewSection dashboard={dashboard} />
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
