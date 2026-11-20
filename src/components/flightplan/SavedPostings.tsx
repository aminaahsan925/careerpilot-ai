import { Link } from "@tanstack/react-router";
import { Briefcase, ArrowRight } from "lucide-react";

import { useStoredJobsWithCoverage } from "@/data/job-intel";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/lib/animation";
import { SpotlightCard } from "@/components/lens/SpotlightCard";

/** The row shape the list renders. The hook's jobs satisfy it structurally. */
export type SavedPostingRow = {
  id: string;
  title: string;
  company: string | null;
  coveragePct: number | null;
};

/**
 * Presentational list, split out so the design can be proven with
 * sample rows without touching the live query. The live route renders
 * it through <SavedPostings> below, never with sample data.
 */
export function SavedPostingsList({ jobs }: { jobs: SavedPostingRow[] }) {
  return (
    <SpotlightCard className="card-surface space-y-4 p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-cp-paper">
            <Briefcase className="h-5 w-5 text-cp-lime" strokeWidth={1.7} />
            Your saved postings
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-cp-stone">
            Deterministic gap analysis per posting, persisted and cached for 30
            days, never mixed with shared company data.
          </p>
        </div>
        <Link
          to="/jobmirror"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cp-lime hover:underline"
        >
          Open Job Mirror
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {jobs.slice(0, 6).map((job) => (
          <li key={job.id}>
            <Link
              to="/jobmirror"
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 transition hover:border-cp-lime/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-cp-paper">
                  {job.title}
                </p>
                <p className="truncate text-[11px] text-cp-stone">
                  {job.company ?? "Company not specified"}
                </p>
              </div>
              {job.coveragePct !== null ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                    job.coveragePct >= 70 &&
                      "bg-cp-lime/10 text-cp-lime",
                    job.coveragePct < 70 &&
                      job.coveragePct >= 40 &&
                      "bg-amber-500/10 text-amber-300",
                    job.coveragePct < 40 && "bg-cp-ember/10 text-cp-ember",
                  )}
                >
                  {job.coveragePct}%
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-cp-stone">
                  Analyze
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </SpotlightCard>
  );
}

/**
 * Flight Plan extension — Phase 5 scope item 1.
 *
 * The candidate's saved postings with their deterministic per-posting
 * gap analysis (persisted to `job_snapshots`, cached per job+user).
 * Coverage badges appear where a fresh snapshot already exists;
 * otherwise the row links to the Job Mirror deep-dive, which computes
 * and persists the analysis on demand.
 *
 * NOTE (port 2026-11-20): the studio version deep-linked to
 * `/jobmirror?job=<id>`, but careerpilot-ai's Job Mirror route has no
 * `job` search param (it is the Interview Prep screen), so these links
 * go to /jobmirror without a search param. Restoring the per-job
 * deep-link needs the studio jobmirror route's validateSearch.
 */
export function SavedPostings() {
  const { data: jobs, isLoading } = useStoredJobsWithCoverage();

  if (isLoading) {
    return (
      <div className="card-surface space-y-3 p-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!jobs || jobs.length === 0) return null;

  return <SavedPostingsList jobs={jobs} />;
}
