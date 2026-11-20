/**
 * Destinations strip (Direction 3, Santorini pattern): the home screen
 * as a map of places to explore, with weather-style hiring signals.
 *
 * Destinations come ONLY from the student's own data already on the
 * dashboard: their target role, and the companies they applied to.
 * Nothing is invented. A destination with no measurable signal shows
 * "Not measured" with the reason, and with no destination-worthy data
 * at all the strip shows an honest empty state instead of fake places.
 *
 * Weather is computed from live ATS postings (see weather.ts). Only
 * companies with a VERIFIED ATS board get a dashboard fetch: fetching
 * a dashboard for any other company would trigger a Tavily research
 * run on a cache miss, which is far too heavy for a dashboard strip.
 * Board membership is checked client-side with resolveAtsBoard.
 */
import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Cloud,
  CloudSun,
  Compass,
  Loader2,
  MapPin,
  Sun,
  type LucideIcon,
} from "lucide-react";

import { companyDashboardQueryKey } from "@/data/company";
import { getCompanyDashboard } from "@/lib/company.functions";
import { resolveAtsBoard } from "@/lib/jobs/ats-providers";
import { cn } from "@/lib/utils";
import { DestinationScene } from "./DestinationScene";
import {
  computeHiringWeather,
  computeRoleWeather,
  type HiringSignal,
  type HiringWeather,
  type MeasurableBoard,
} from "./weather";

export type DestinationApplication = {
  company: string;
  role: string;
  status: string;
};

const MAX_COMPANY_DESTINATIONS = 3;

const SIGNAL_META: Record<
  HiringSignal,
  { label: string; icon: LucideIcon; bubble: string }
> = {
  busy: {
    label: "Busy",
    icon: Sun,
    bubble: "bg-[var(--d3-mustard)] text-[var(--d3-choco)]",
  },
  steady: {
    label: "Steady",
    icon: CloudSun,
    bubble: "bg-[var(--d3-sky)] text-[var(--d3-choco)]",
  },
  quiet: {
    label: "Quiet",
    icon: Cloud,
    bubble: "bg-[var(--d3-peri)] text-[var(--d3-choco)]",
  },
  not_measured: {
    label: "Not measured",
    icon: Compass,
    bubble:
      "border-2 border-dashed border-[var(--d3-choco)]/40 bg-[var(--d3-paper)] text-[var(--d3-choco)]",
  },
};

function WeatherBubble({
  weather,
  loading,
}: {
  weather: HiringWeather;
  loading: boolean;
}) {
  if (loading) {
    return (
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--d3-paper)] text-[var(--d3-choco)] shadow-md"
        title="Checking the live board"
      >
        <Loader2 className="h-5 w-5 animate-spin" />
      </span>
    );
  }
  const meta = SIGNAL_META[weather.signal];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full shadow-md",
        meta.bubble,
      )}
      title={meta.label}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </span>
  );
}

/** The rule, stated in plain words under every signal. */
function WeatherLine({
  weather,
  loading,
  scope,
}: {
  weather: HiringWeather;
  loading: boolean;
  /** What the count covers, e.g. "Software Engineer postings, across your applications". */
  scope: string;
}) {
  if (loading) {
    return (
      <p className="text-[12px] font-medium text-[var(--d3-choco)]/70">
        Checking the live board…
      </p>
    );
  }
  const meta = SIGNAL_META[weather.signal];
  if (weather.signal === "not_measured") {
    return (
      <p className="text-[12px] font-medium text-[var(--d3-choco)]/70">
        <span className="font-bold text-[var(--d3-choco)]">{meta.label}</span>
        {weather.reason ? ` · ${weather.reason}` : ""}
      </p>
    );
  }
  const count = weather.newThisWeek ?? 0;
  return (
    <p className="text-[12px] font-medium text-[var(--d3-choco)]/70">
      <span className="font-bold text-[var(--d3-choco)]">{meta.label}</span>
      {` · based on ${count} new ${scope} in the last 7 days`}
    </p>
  );
}

function DestinationCard({
  to,
  name,
  chip,
  subtitle,
  weather,
  loading,
  scope,
  tilt,
}: {
  to: string;
  name: string;
  chip: string;
  subtitle: string;
  weather: HiringWeather;
  loading: boolean;
  scope: string;
  tilt: "l" | "r";
}) {
  return (
    <Link
      to={to}
      className={cn(
        "d3-card group block transition-transform hover:-translate-y-1",
        tilt === "l" ? "d3-tilt-l" : "d3-tilt-r",
      )}
    >
      <div className="relative overflow-hidden rounded-xl">
        <DestinationScene name={name} className="h-28 w-full" />
        <div className="absolute bottom-2 right-2">
          <WeatherBubble weather={weather} loading={loading} />
        </div>
      </div>
      <div className="pt-3">
        <span className="d3-chip bg-[var(--d3-mustard)]/40 text-[var(--d3-choco)]">{chip}</span>
        <h4 className="d3-display mt-2 truncate text-[17px] leading-tight">{name}</h4>
        <p className="mt-0.5 truncate text-[12.5px] text-[var(--d3-choco)]/70">{subtitle}</p>
        <div className="mt-2">
          <WeatherLine weather={weather} loading={loading} scope={scope} />
        </div>
        <p className="mt-3 text-[12px] font-bold text-[var(--d3-flame)] group-hover:underline">
          Explore →
        </p>
      </div>
    </Link>
  );
}

export function DestinationsStrip({
  targetRole,
  targetIndustry,
  applications,
}: {
  targetRole: string | null;
  targetIndustry: string | null;
  applications: DestinationApplication[];
}) {
  const role = (targetRole ?? "").trim() || null;

  // Dedupe applied companies (case-insensitive), keep the most recent.
  const companies = applications.reduce<DestinationApplication[]>((acc, app) => {
    const name = app.company.trim();
    if (!name) return acc;
    if (acc.some((item) => item.company.toLowerCase() === name.toLowerCase())) return acc;
    acc.push({ ...app, company: name });
    return acc;
  }, []).slice(0, MAX_COMPANY_DESTINATIONS);

  // Only board companies get a live fetch (see the module comment).
  const boardCompanies = companies.filter(
    (app) => resolveAtsBoard(app.company) !== null,
  );

  const boardQueries = useQueries({
    queries: boardCompanies.map((app) => ({
      queryKey: companyDashboardQueryKey(app.company),
      queryFn: () => getCompanyDashboard({ data: { companyName: app.company } }),
      staleTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });

  const boardByCompany = new Map(
    boardCompanies.map((app, i) => [app.company.toLowerCase(), boardQueries[i]]),
  );

  const boards: MeasurableBoard[] = companies.map((app) => {
    const query = boardByCompany.get(app.company.toLowerCase());
    if (!query) return { hasBoard: false, available: false, postings: [] };
    const live = query.data?.livePostings;
    return {
      hasBoard: true,
      available: live?.available ?? false,
      postings: live?.postings ?? [],
    };
  });

  const anyBoardLoading = boardQueries.some((query) => query.isPending);
  const roleWeather = role ? computeRoleWeather(boards, role) : null;

  if (!role && companies.length === 0) {
    return (
      <section aria-label="Destinations">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="d3-display text-[20px] leading-tight">Where hiring is warm</h3>
        </div>
        <div className="d3-card mt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--d3-mustard)] text-[var(--d3-choco)]">
              <MapPin className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-[14px] font-bold">Add a target role to see where hiring is warm</p>
              <p className="mt-0.5 max-w-md text-[12.5px] leading-relaxed text-[var(--d3-choco)]/70">
                Set a target role, or track an application, and this map fills in with live
                hiring weather from real job boards.
              </p>
            </div>
          </div>
          <Link
            to="/onboarding"
            className="rounded-xl bg-[var(--d3-choco)] px-4 py-2.5 text-[12.5px] font-bold text-[var(--d3-cream)] transition-transform hover:-translate-y-0.5"
          >
            Set a target role →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Destinations">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="d3-display text-[20px] leading-tight">Where hiring is warm</h3>
          <p className="mt-1 text-[12.5px] text-[var(--d3-choco)]/70">
            Weather comes from live job boards. Busy means 5 or more new postings in the last
            7 days.
          </p>
        </div>
        <Link
          to="/market"
          className="text-[12px] font-bold text-[var(--d3-flame)] hover:underline"
        >
          See the market →
        </Link>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {role && roleWeather ? (
          <DestinationCard
            to="/market"
            name={role}
            chip="Your target role"
            subtitle={targetIndustry ? `In ${targetIndustry}` : "Where you are headed"}
            weather={roleWeather}
            loading={anyBoardLoading}
            scope={`${role} postings, across your applications`}
            tilt="l"
          />
        ) : null}

        {companies.map((app, i) => {
          const query = boardByCompany.get(app.company.toLowerCase());
          const board = boards[i] ?? { hasBoard: false, available: false, postings: [] };
          const weather = computeHiringWeather(board);
          return (
            <DestinationCard
              key={app.company}
              to="/company"
              name={app.company}
              chip={app.status}
              subtitle={`Applied for ${app.role}`}
              weather={weather}
              loading={query?.isPending ?? false}
              scope="postings"
              tilt={i % 2 === 0 ? "r" : "l"}
            />
          );
        })}
      </div>
    </section>
  );
}
