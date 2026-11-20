import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useJobMirror } from "@/data/jobmirror";
import { Skeleton } from "@/lib/animation";
import { AppLayout } from "@/components/app/AppLayout";
import { FlightPlanView } from "@/components/flightplan/FlightPlanView";
import { MagneticButton } from "@/components/lens/MagneticButton";

export const Route = createFileRoute("/_authenticated/flightplan")({
  head: () => ({
    meta: [
      { title: "Flight Plan - CareerPilot AI" },
      {
        name: "description",
        content:
          "What employers actually require for your target role, held up against your proof.",
      },
    ],
  }),
  component: FlightPlanPage,
});

const LAYOUT_TITLE = "Flight Plan";
const LAYOUT_SUBTITLE =
  "Researched employer expectations, skill proof matching, and market readiness.";

/* ------------------------------------------------------------------ */
/* Main Flight Plan Page: the query lives here; the layout and the     */
/* tabs live in <FlightPlanView>, so the design can be proven with     */
/* sample data without touching live data.                             */
/* ------------------------------------------------------------------ */

function FlightPlanPage() {
  const [roleOverride, setRoleOverride] = useState<string | null>(null);
  const { data: report, isLoading, error } = useJobMirror(roleOverride ?? undefined);

  if (isLoading) return <LoadingState />;
  if (error || !report) return <ErrorState error={error} />;

  return (
    <AppLayout title={LAYOUT_TITLE} subtitle={LAYOUT_SUBTITLE}>
      <FlightPlanView report={report} roleOverride={roleOverride} onPickRole={setRoleOverride} />
    </AppLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Loading & Error States                                              */
/* ------------------------------------------------------------------ */

function LoadingState() {
  return (
    <AppLayout title={LAYOUT_TITLE} subtitle={LAYOUT_SUBTITLE}>
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Please try again in a moment.";
  const lowerMessage = message.toLowerCase();
  const needsTarget = lowerMessage.includes("target career");
  const needsSignIn = lowerMessage.includes("session") || lowerMessage.includes("sign in");

  return (
    <AppLayout title={LAYOUT_TITLE} subtitle={LAYOUT_SUBTITLE}>
      <div className="card-surface flex min-h-[320px] items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-4">
          <p className="cp-eyebrow text-cp-ember">Flight Plan unavailable</p>
          <p className="text-[16px] font-bold text-cp-paper">
            {needsTarget
              ? "Pick a target role first"
              : needsSignIn
                ? "Your Flight Plan session has expired"
                : "Flight Plan couldn't be loaded."}
          </p>
          <p className="text-[13px] text-cp-stone">{message}</p>
          {needsSignIn ? (
            /* Plain Link, not MagneticButton: the redirect search param
               must survive, and MagneticButton carries no search. */
            <Link
              to="/auth"
              search={{ redirect: "/flightplan", reset: undefined }}
              className="inline-block rounded-xl bg-cp-lime px-5 py-2.5 text-[13px] font-semibold text-cp-ink"
            >
              Sign in again
            </Link>
          ) : (
            <MagneticButton
              href={needsTarget ? "/onboarding" : "/dashboard"}
              className="inline-block rounded-xl bg-cp-lime px-5 py-2.5 text-[13px] font-semibold text-cp-ink"
            >
              {needsTarget ? "Set your target role" : "Back to Dashboard"}
            </MagneticButton>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
