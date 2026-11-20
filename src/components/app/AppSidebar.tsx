import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BrainCircuit,
  FileText,
  Flame,
  LayoutGrid,
  Map,
  MessageCircle,
  Plane,
  Sparkles,
  Stethoscope,
  User,
  UserCheck,
} from "lucide-react";

import { useCurrentUser } from "@/data/user";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  icon: typeof LayoutGrid;
  to: string;
};

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Understand",
    items: [
      { label: "Dashboard", icon: LayoutGrid, to: "/dashboard" },
      { label: "Diagnosis", icon: Stethoscope, to: "/diagnosis" },
      { label: "Market Reality", icon: BarChart3, to: "/market" },
      { label: "Tech Events", icon: Flame, to: "/events" },
    ],
  },
  {
    label: "Build Proof",
    items: [
      { label: "Roadmap", icon: Map, to: "/roadmap" },
      { label: "Flight Plan", icon: Plane, to: "/flightplan" },
      { label: "Future Tech Trends", icon: Sparkles, to: "/future-tech" },
      { label: "Resumes", icon: FileText, to: "/resume" },
    ],
  },
  {
    label: "Get Hired",
    items: [
      { label: "Recruiter Audit", icon: UserCheck, to: "/recruiter" },
      { label: "Interview Prep", icon: BrainCircuit, to: "/jobmirror" },
      { label: "AI Mentor", icon: MessageCircle, to: "/mentor" },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Profile", icon: User, to: "/profile" }],
  },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: user } = useCurrentUser();

  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground">
      <div className="px-2">
        <Sparkles className="h-6 w-6 text-sidebar-primary-foreground" strokeWidth={1.5} />
        <p className="mt-3 text-[17px] font-extrabold tracking-[0.14em] text-sidebar-primary-foreground">
          CAREERPILOT
        </p>
        <p className="text-[13px] font-semibold tracking-[0.16em] text-terracotta">AI</p>
      </div>

      <nav className="mt-8 flex-1 space-y-5 overflow-y-auto pr-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.18em] text-sidebar-foreground/35">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ label, icon: Icon, to }) => {
                const active = pathname === to;
                const className = cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                );
                return (
                  <Link key={label} to={to} onClick={onNavigate} className={className}>
                    <Icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-sidebar-border bg-card px-3 py-3">
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={user.fullName || "User avatar"}
            loading="lazy"
            className="h-9 w-9 shrink-0 rounded-full bg-muted object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta text-[12px] font-bold text-primary-foreground">
            {user?.fullName
              ? user.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "CP"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">{user?.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
        </div>
      </div>
    </div>
  );
}
