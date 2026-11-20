import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { AppLayout } from "@/components/app/AppLayout";
import { TechEventsSection } from "@/components/market/TechEventsSection";
import { useCurrentUser } from "@/data/user";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Tech Events & Hackathons — CareerPilot AI" },
      {
        name: "description",
        content:
          "Discover real-time student hackathons, developer conferences, and coding workshops in your city. Add them as milestones to your career flight plan.",
      },
    ],
  }),
  component: TechEventsPage,
});

function TechEventsPage() {
  const { data: user, isLoading } = useCurrentUser();

  return (
    <AppLayout
      title={
        <span className="flex items-center gap-2">
          Tech Events & Hackathons{" "}
          <Sparkles className="h-5 w-5 text-terracotta" />
        </span>
      }
      subtitle="Discover hackathons, workshops, and hiring conferences in your city. Pin them as milestone targets in your career roadmap."
    >
      <div className="space-y-6 pb-12">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-44 animate-pulse rounded-3xl bg-secondary/80" />
            <div className="h-40 animate-pulse rounded-3xl bg-secondary/80" />
          </div>
        ) : (
          <TechEventsSection
            userCity={user?.city?.trim() ? user.city : undefined}
            targetRole={user?.role || "Software Engineer"}
          />
        )}
      </div>
    </AppLayout>
  );
}
