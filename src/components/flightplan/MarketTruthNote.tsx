import { ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react";

import type { MirrorCitation } from "@/lib/jobmirror.server";
import { SpotlightCard } from "@/components/lens/SpotlightCard";

/**
 * Renders the attribution behind a market claim. Links out when the
 * research report gave a URL, otherwise shows the attribution as plain
 * text — never a fake link.
 */
export function Cite({ citation }: { citation: MirrorCitation | null }) {
  if (!citation) return null;

  if (!citation.url) {
    return (
      <span className="font-mono text-[11px] leading-5 text-cp-stone">
        Source: {citation.label}
      </span>
    );
  }

  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 font-mono text-[11px] leading-5 text-cp-stone underline decoration-dotted underline-offset-2 hover:text-cp-lime"
    >
      {citation.label}
      <ExternalLink className="h-3 w-3" strokeWidth={1.7} />
    </a>
  );
}

/**
 * Dataset provenance. Shown at the bottom of every step so the student
 * always knows how old the market data is and where it came from.
 */
export function Provenance({
  version,
  lastResearched,
  note,
  staleFieldGroups,
}: {
  version: string;
  lastResearched: string;
  note: string;
  staleFieldGroups: string[];
}) {
  const stale = staleFieldGroups.length > 0;

  return (
    <SpotlightCard className="card-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div
          className={
            stale
              ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"
              : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cp-lime/10 text-cp-lime"
          }
        >
          {stale ? (
            <TriangleAlert className="h-4 w-4" strokeWidth={1.7} />
          ) : (
            <ShieldCheck className="h-4 w-4" strokeWidth={1.7} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-cp-paper">
            Researched {lastResearched} · dataset {version}
          </p>
          <p className="mt-1 text-xs leading-5 text-cp-stone">{note}</p>
          {stale && (
            <p className="mt-2 text-xs leading-5 text-amber-300">
              Due for a refresh: {staleFieldGroups.join(", ")}. Treat these figures as indicative
              until the next research pass.
            </p>
          )}
        </div>
      </div>
    </SpotlightCard>
  );
}
