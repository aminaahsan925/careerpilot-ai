import { useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  DollarSign,
  ExternalLink,
  Flame,
  Globe,
  Globe2,
  Info,
  Layers,
  Lightbulb,
  Loader2,
  LockKeyhole,
  Map,
  Pencil,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useMarketReality,
  useRefreshMarketReality,
  useUpdateTargetRole,
  useOutdatedTech,
} from "@/data/market";
import { useCurrentUser } from "@/data/user";
import { useGenerateRoadmapV2 } from "@/data/roadmap-v2";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/market")({
  head: () => ({
    meta: [
      { title: "Market Reality & Future Tech — CareerPilot AI" },
      {
        name: "description",
        content:
          "Discover what employers demand worldwide for your role, with optional local market context and live future-tech signals.",
      },
    ],
  }),
  component: MarketRealityPage,
});

/* ------------------------------------------------------------------ */
/* Popular Suggested Roles for Quick Switching                        */
/* ------------------------------------------------------------------ */

const POPULAR_ROLES = [
  "Associate Software Engineer",
  "Frontend Engineer (React / Next.js)",
  "Full Stack Developer (MERN)",
  "Python & AI Engineer",
  "Backend (.NET / Java / Node) Developer",
  "Mobile App Developer (Flutter)",
  "Data Analyst / Engineer",
  "Cloud & DevOps Engineer",
  "Associate SQA & Automation",
  "UI/UX & Product Designer",
];

/* ------------------------------------------------------------------ */
/* Progressive Steps Definition                                       */
/* ------------------------------------------------------------------ */

const STEPS = [
  { id: 1, title: "1. Role & Scope", subtitle: "Target & Expectations", icon: Target },
  { id: 2, title: "2. Hiring Reality", subtitle: "Global market signals", icon: ShieldAlert },
  { id: 3, title: "3. Market Demands", subtitle: "Tech & Future Trends", icon: Zap },
  { id: 4, title: "4. Your Standing", subtitle: "Gaps vs 100% Bar", icon: BarChart3 },
  { id: 5, title: "5. 100% Blueprint", subtitle: "Salaries & Roadmap", icon: Rocket },
  { id: 6, title: "6. Expert Opinion", subtitle: "Your personal verdict", icon: Sparkles },
];

function MarketRealityPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: market, isLoading, error } = useMarketReality();
  const { data: outdatedData } = useOutdatedTech();
  const refreshMutation = useRefreshMarketReality();
  const updateRole = useUpdateTargetRole();
  const generateRoadmap = useGenerateRoadmapV2();

  const [activeStep, setActiveStep] = useState(1);
  const [marketScope, setMarketScope] = useState<"both" | "pakistan" | "global">("global");
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [changingRole, setChangingRole] = useState(false);
  const [generatedSuccess, setGeneratedSuccess] = useState(false);
  const [roadmapItems, setRoadmapItems] = useState<string[]>([]);
  const [opinionSearch, setOpinionSearch] = useState("");
  const marketContentRef = useRef<HTMLDivElement>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const expertOpinionRef = useRef<HTMLElement>(null);

  /* ---- Loading State ---- */
  if (isLoading) {
    return (
      <AppLayout
        title="Market Reality"
        subtitle="Synthesizing real-time market data & future tech trends..."
      >
        <div className="space-y-6">
          <div className="h-44 animate-pulse rounded-3xl bg-secondary/80" />
          <div className="h-96 animate-pulse rounded-3xl bg-secondary/80" />
        </div>
      </AppLayout>
    );
  }

  /* ---- Error / Missing Role State ---- */
  if (error || !market) {
    return (
      <AppLayout
        title="Market Reality"
        subtitle="Connect your target role to see real-world hiring data"
      >
        <div className="card-surface mx-auto max-w-lg p-8 text-center sm:p-12 border-terracotta/20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta">
            <Target className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
            Select Your Target Role
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Choose what career role you want to inspect in the real market. We will pull researched
            hiring expectations, entry-level filters, and salary benchmarks.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {POPULAR_ROLES.slice(0, 4).map((r) => (
              <Button
                key={r}
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold hover:border-terracotta/40 hover:text-terracotta"
                onClick={async () => {
                  await updateRole.mutateAsync(r);
                }}
              >
                {r}
              </Button>
            ))}
          </div>
          <div className="mt-8 border-t border-border pt-6 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Careers you could explore
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                {
                  role: "Frontend Developer",
                  fit: "82% fit",
                  reason: "A strong route if you enjoy interfaces and visible product work.",
                },
                {
                  role: "Data Analyst",
                  fit: "74% fit",
                  reason:
                    "A practical route if you like patterns, numbers, and business questions.",
                },
                {
                  role: "Backend Developer",
                  fit: "68% fit",
                  reason: "A good route if you prefer systems, APIs, and logic behind the product.",
                },
              ].map((recommendation) => (
                <div
                  key={recommendation.role}
                  className="rounded-xl border border-border bg-secondary/35 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground">{recommendation.role}</p>
                    <span className="text-[10px] font-black text-terracotta">
                      {recommendation.fit}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {recommendation.reason}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 px-0 text-[10px] font-bold text-terracotta"
                    onClick={() => updateRole.mutate(recommendation.role)}
                  >
                    Choose this target <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-xs font-bold text-foreground">Not sure yet?</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Use your existing profile to start with a general market baseline, then choose a
              target when you are ready.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 rounded-xl text-xs font-bold text-terracotta"
              onClick={() => updateRole.mutate("I don't know my target yet")}
            >
              I don't know my target yet <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleRoleChange = async (roleName: string) => {
    if (!roleName.trim()) return;
    setChangingRole(true);
    try {
      await updateRole.mutateAsync(roleName.trim());
      setShowRoleDialog(false);
      setCustomRoleInput("");
      toast.success(`Updated target role to ${roleName.trim()}!`);
    } catch {
      toast.error("Failed to update target role.");
    } finally {
      setChangingRole(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync();
      toast.success("Market reality data refreshed from latest research pass!");
    } catch {
      toast.error("Couldn't refresh data right now.");
    }
  };

  const handleGenerateRoadmap = () => {
    generateRoadmap.mutate(undefined, {
      onSuccess: (res) => {
        if (res.success) {
          toast.success("100% Market Blueprint synced into your Career Roadmap!");
          setGeneratedSuccess(true);
        } else {
          toast.error(res.error || "Failed to generate roadmap.");
        }
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to sync to roadmap.");
      },
    });
  };

  const goToStep = (step: number) => {
    setActiveStep(step);
    window.requestAnimationFrame(() =>
      stepContentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      }),
    );
  };

  const addToRoadmap = (item: string) => {
    setRoadmapItems((current) => (current.includes(item) ? current : [...current, item]));
    toast.success(`${item} added to your roadmap queue.`);
  };

  // Calculate student's skill match vs market demand
  const userSkillNames = (user?.skills ?? []).map((s) => s.name.toLowerCase());
  const highDemandSkills = market.skillDemand.high || [];
  const matchedHighSkills = highDemandSkills.filter((s) =>
    userSkillNames.some((us) => us.includes(s.toLowerCase()) || s.toLowerCase().includes(us)),
  );
  const localMatchPct =
    highDemandSkills.length > 0
      ? Math.round((matchedHighSkills.length / highDemandSkills.length) * 100)
      : 45;
  const globalMatchPct = Math.max(20, Math.min(95, localMatchPct - 15));
  const criticalGaps = highDemandSkills.filter((skill) => !matchedHighSkills.includes(skill));
  const positionLabel =
    localMatchPct >= 75
      ? "Competitive junior"
      : localMatchPct >= 50
        ? "Early-career candidate"
        : "Beginner / building proof";
  const profileSkills = user?.skills?.map((skill) => skill.name).slice(0, 5) ?? [];
  const firstOutdatedItem = outdatedData?.outdatedItems[0];
  const localDemandSummary = market.pakistanMarket?.demand?.trim() ?? "";
  const globalDemandSummary = market.globalMarket?.demand?.trim() ?? "";
  const localDemandIsLong = localDemandSummary.length > 52;
  const globalDemandIsLong = globalDemandSummary.length > 52;
  const localHiringCities = market.pakistanMarket?.hiringCities?.filter(Boolean) ?? [];

  return (
    <AppLayout
      title={
        <span>
          Market Reality & Future Tech <Sparkles className="inline h-5 w-5 text-terracotta" />
        </span>
      }
      subtitle="The worldwide hiring bar for your target role, with optional local context and live emerging tech signals."
    >
      <div ref={marketContentRef} className="space-y-6 pb-12">
        {/* Top Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs font-bold"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-semibold border-terracotta/30 hover:bg-terracotta/10 hover:text-terracotta"
              onClick={() => setShowRoleDialog(true)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5 text-terracotta" />
              Change Role: <strong className="ml-1 text-foreground">{market.targetRole}</strong>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-semibold"
              disabled={refreshMutation.isPending}
              onClick={handleRefresh}
            >
              <RefreshCw
                className={cn(
                  "mr-1.5 h-3.5 w-3.5 text-terracotta",
                  refreshMutation.isPending && "animate-spin",
                )}
              />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Target selector: visible before the report so every section has clear context. */}
        <section className="card-surface flex flex-col gap-4 border-terracotta/20 bg-gradient-to-r from-card to-terracotta/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-terracotta">
                Your target career
              </p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
                {market.targetRole}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Every expectation, gap, and recommendation below is mapped to this target.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-xl border-terracotta/30 font-bold hover:bg-terracotta/10 hover:text-terracotta"
            onClick={() => setShowRoleDialog(true)}
          >
            <Pencil className="mr-2 h-4 w-4 text-terracotta" />
            Search or change target
          </Button>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PREMIUM LANDING HERO — Market Reality                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeStep === 1 && (
          <section className="relative overflow-hidden rounded-3xl border border-terracotta/20 bg-[#09090b] shadow-2xl">
            {/* Decorative ambient glows */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-80 w-80 rounded-full bg-terracotta/10 blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-terracotta/8 blur-[100px]" />

            {/* ── Top Row: Illustration + Hero Copy ─────────────────── */}
            <div className="relative z-10 grid min-w-0 items-stretch lg:grid-cols-[1.1fr_0.9fr]">
              {/* Left: Illustration Panel */}
              <div className="relative order-2 flex min-w-0 min-h-[360px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#f8f2ea] via-[#f5ede3] to-[#ead8c8] p-0 sm:min-h-[440px] lg:order-2 lg:-ml-8 lg:min-h-[560px] lg:rounded-r-3xl lg:pl-8">
                {/* Subtle corner badge */}
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute top-4 left-8 z-20 flex items-center gap-2 rounded-full border border-terracotta/25 bg-[#f8f2ea]/85 px-3 py-1.5 shadow-sm backdrop-blur"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-terracotta text-white">
                    <BarChart3 className="h-3 w-3" />
                  </div>
                  <span className="text-[11px] font-bold text-[#09090b]">Market Reality</span>
                </motion.div>

                <motion.img
                  src="/market-reality-hero.png"
                  alt="Market Reality — woman presenting market data on a whiteboard"
                  className="relative z-10 block h-full min-h-[360px] w-full min-w-0 max-w-full object-contain object-center mix-blend-multiply opacity-[0.94] sm:min-h-[440px] lg:min-h-[560px]"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>

              {/* Right: Editorial Copy & CTA */}
              <div className="order-1 flex flex-col justify-center gap-6 p-7 text-white sm:p-10 lg:order-1 lg:p-12">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="space-y-4"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/15 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-terracotta border border-terracotta/25">
                    <Sparkles className="h-3.5 w-3.5" /> Live Market Intelligence
                  </span>

                  <h1 className="font-display text-3xl font-black sm:text-4xl xl:text-5xl leading-[1.1] tracking-tight">
                    Know What <br />
                    <span className="text-terracotta">Employers Want.</span>
                  </h1>

                  <p className="text-sm leading-relaxed text-white/70 max-w-lg">
                    See the <strong className="text-white">brutal truth</strong> of what hiring
                    managers demand for{" "}
                    <strong className="text-terracotta">{market.targetRole}</strong> — salaries in
                    global compensation, skill demand heatmaps, and future tech trends. Zero fluff.
                  </p>
                </motion.div>

                {/* Quick Feature Pills */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    { icon: DollarSign, title: "Salary Benchmarks", sub: "PKR & USD ranges" },
                    { icon: Target, title: "Skill Demand Map", sub: "What's hot vs cold" },
                    { icon: TrendingUp, title: "Future Tech Signals", sub: "AI, Cloud & more" },
                    { icon: Globe2, title: "Global Market Lens", sub: "Worldwide signals" },
                  ].map((f) => (
                    <div
                      key={f.title}
                      className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-terracotta/15 text-terracotta">
                        <f.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white">{f.title}</p>
                        <p className="text-[10px] text-white/50">{f.sub}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* Scope Switcher */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap items-center gap-2 pt-1"
                >
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest mr-1">
                    Scope:
                  </span>
                  {[
                    { id: "global", label: "Global", icon: Globe },
                    { id: "both", label: "Global + Local", icon: Globe2 },
                    { id: "pakistan", label: "Local", icon: Building2 },
                  ].map((scope) => (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => setMarketScope(scope.id as typeof marketScope)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11px] font-bold transition-all border",
                        marketScope === scope.id
                          ? "border-terracotta bg-terracotta text-white shadow-lg"
                          : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <scope.icon className="h-3.5 w-3.5" />
                      {scope.label}
                    </button>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* ── Bottom Strip: Live Stats Bar ────────────────────── */}
            <div className="relative z-10 border-t border-white/10 bg-white/[0.03] px-7 py-5 sm:px-10">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {/* Stat 1: Match Score Gauge */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-3"
                >
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="7"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        className="stroke-terracotta"
                        strokeWidth="7"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * localMatchPct) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-sm font-black text-white">{localMatchPct}%</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white">Your Match</p>
                    <p className="text-[10px] text-white/50">
                      {localMatchPct >= 70 ? "Competitive" : "Needs work"}
                    </p>
                  </div>
                </motion.div>

                {/* Stat 2: Entry-Level Filter */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white">Entry-Level Filter</p>
                    <p className="text-[10px] text-white/50">{"70-85%"} rejected</p>
                  </div>
                </motion.div>

                {/* Stat 3: Pakistan Salary */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white">Pakistan Salary</p>
                    <p className="text-[10px] text-white/50">{"PKR 40-80k"}/mo</p>
                  </div>
                </motion.div>

                {/* Stat 4: Demanded Skills */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white">Top Skills</p>
                    <p className="text-[10px] text-white/50 truncate max-w-[120px]">
                      {highDemandSkills.slice(0, 3).join(", ") || "Loading…"}
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        )}

        {/* Step-by-Step Progressive Navigation Rail */}
        <div className="card-surface p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-6">
            {STEPS.map((s) => {
              const isCurrent = activeStep === s.id;
              const isPassed = activeStep > s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToStep(s.id)}
                  className={cn(
                    "flex min-w-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all border sm:px-3.5",
                    isCurrent
                      ? "border-terracotta/40 bg-ink text-white shadow-md scale-102"
                      : isPassed
                        ? "border-emerald-500/20 bg-secondary/70 text-foreground hover:bg-secondary"
                        : "border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                      isCurrent
                        ? "bg-terracotta text-white shadow-xs"
                        : isPassed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {isPassed ? <Check className="h-3.5 w-3.5" /> : s.id}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-tight">{s.title}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground opacity-80">
                      {s.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progressive Step Views */}
        <div ref={stepContentRef}>
          <AnimatePresence mode="wait">
            {/* STEP 1: Target & Scope Definition */}
            {activeStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                  {/* Left Card: Role Breakdown & Daily Responsibilities */}
                  <div className="card-surface p-6 sm:p-8 space-y-6 border-terracotta/15">
                    <div className="flex items-center gap-2.5">
                      <Briefcase className="h-5 w-5 text-terracotta" />
                      <h2 className="font-display text-xl font-bold text-foreground">
                        Role Definition & Day-to-Day Realities
                      </h2>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      What software houses and global employers actually hire a{" "}
                      <strong>{market.targetRole}</strong> to do:
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {market.roleSnapshot.involves.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-xs"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-[10px] font-bold text-terracotta mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-foreground leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>

                    {market.responsibilities && market.responsibilities.length > 0 && (
                      <div className="border-t border-border pt-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                          Key Engineering Responsibilities
                        </h3>
                        <div className="space-y-2">
                          {market.responsibilities.slice(0, 4).map((r) => (
                            <div
                              key={r.label}
                              className="rounded-xl bg-secondary/50 p-3 text-xs border border-border/50"
                            >
                              <span className="font-bold text-foreground">{r.label}: </span>
                              <span className="text-muted-foreground">{r.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Card: Quick Change Role & Scope Tips */}
                  <div className="space-y-6">
                    <div className="card-surface p-6 space-y-3">
                      <h3 className="font-bold text-sm text-foreground">Switch Target Role</h3>
                      <p className="text-xs text-muted-foreground">
                        Explore what other engineering roles demand in the current market:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_ROLES.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleRoleChange(r)}
                            className={cn(
                              "rounded-full px-3 py-1 text-[11px] font-semibold transition-all border",
                              market.targetRole === r
                                ? "border-terracotta bg-terracotta text-white shadow-xs"
                                : "border-border bg-card text-muted-foreground hover:border-terracotta/40 hover:text-foreground",
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="card-surface p-6 bg-gradient-to-br from-card to-terracotta/5 border-terracotta/20">
                      <div className="flex items-center gap-2 text-terracotta">
                        <Lightbulb className="h-5 w-5" />
                        <h3 className="font-bold text-sm text-foreground">
                          Industry Truth for Students
                        </h3>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        The job market does not evaluate you on courses taken. It evaluates you on{" "}
                        <strong>reproducible code</strong>: public GitHub repositories, clean commit
                        histories, and live deployed URLs.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Next Step CTA */}
                <div className="flex justify-end pt-4 border-t border-border">
                  <Button
                    className="rounded-xl px-6 font-bold text-xs shadow-md"
                    onClick={() => goToStep(2)}
                  >
                    Next: Inspect Local & Global Hiring Reality{" "}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: The Brutal Hiring Truth (Local vs Global) */}
            {activeStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className={cn("grid gap-6", marketScope === "both" ? "2xl:grid-cols-2" : "grid-cols-1")}>
                  {/* Pakistan Local Market Truth */}
                  {(marketScope === "both" || marketScope === "pakistan") && (
                    <div className="card-surface p-6 sm:p-8 space-y-5 border-emerald-500/25">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2">
                            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                            <h2 className="min-w-0 break-words font-display text-lg font-bold leading-tight text-foreground">
                            Pakistan Local Market Reality
                            </h2>
                          </div>
                          {!localDemandIsLong && (
                            <span className="max-w-full rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold leading-tight text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {localDemandSummary || "Local market context"}
                            </span>
                          )}
                        </div>
                        {localDemandIsLong && (
                          <p className="rounded-xl border border-emerald-500/15 bg-emerald-50/70 p-3 text-xs leading-relaxed text-emerald-950 dark:bg-emerald-950/25 dark:text-emerald-100">
                            {localDemandSummary}
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl bg-secondary/60 p-4 text-xs space-y-2 border border-border/60">
                        <p className="font-bold text-foreground">Top Hiring Hubs in Pakistan:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(localHiringCities.length ? localHiringCities : [
                              "Lahore",
                              "Karachi",
                              "Islamabad / Rawalpindi",
                              "Remote",
                            ]).map((c) => (
                            <span
                              key={c}
                              className="rounded-md bg-card border border-border px-2.5 py-1 font-semibold text-foreground text-xs shadow-xs"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          Entry-Level Filtering Realities (Local Software Houses)
                        </h3>
                        <ul className="space-y-2 text-xs text-foreground">
                          {(
                            market.pakistanMarket?.entryLevelExpectations ||
                            market.entryLevelReality || [
                              "70%+ of applicants with only academic projects are screened out immediately.",
                              "Local software houses expect hands-on familiarity with git workflows and basic Docker.",
                              "Technical tests filter heavily on OOP concepts, relational DB queries, and basic algorithms.",
                            ]
                          )
                            .slice(0, 4)
                            .map((item, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 rounded-lg bg-card/50 p-2.5 border border-border/40"
                              >
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                        </ul>
                      </div>

                      {market.pakistanMarket?.patterns &&
                        market.pakistanMarket.patterns.length > 0 && (
                          <div className="rounded-xl border border-border bg-card p-3.5 text-xs text-muted-foreground">
                            <p className="font-semibold text-foreground mb-1">
                              Local Hiring Pattern:
                            </p>
                            <p>{market.pakistanMarket.patterns[0]}</p>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Global Remote Market Truth */}
                  {(marketScope === "both" || marketScope === "global") && (
                    <div className="card-surface p-6 sm:p-8 space-y-5 border-blue-500/25">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2">
                            <Globe className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                            <h2 className="min-w-0 break-words font-display text-lg font-bold leading-tight text-foreground">
                              Global Remote Market Reality
                            </h2>
                          </div>
                          {!globalDemandIsLong && (
                            <span className="max-w-full rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold leading-tight text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                              {globalDemandSummary || "Global market context"}
                            </span>
                          )}
                        </div>
                        {globalDemandIsLong && (
                          <p className="rounded-xl border border-blue-500/15 bg-blue-50/70 p-3 text-xs leading-relaxed text-blue-950 dark:bg-blue-950/25 dark:text-blue-100">
                            {globalDemandSummary}
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 p-4 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                        <p className="font-bold">The Global Compensation Advantage:</p>
                        <p className="text-[11px] leading-relaxed">
                          International startups pay{" "}
                          <strong>$1,500 – $4,500/month (~400k–1.2M PKR)</strong> for junior-to-mid
                          roles, but reject 90%+ of applicants who cannot demonstrate autonomous
                          shipping.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          Global Remote Expectations
                        </h3>
                        <ul className="space-y-2 text-xs text-foreground">
                          {(
                            market.globalMarket?.pakistanVsInternational || [
                              "Flawless written async communication and clear PR documentation.",
                              "Full TypeScript / strict type safety is mandatory (plain JS is dismissed).",
                              "Requires production deployed apps with video walkthroughs (Loom).",
                              "Automated test suites (Jest/Cypress/Playwright) are non-negotiable.",
                            ]
                          )
                            .slice(0, 4)
                            .map((item, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 rounded-lg bg-card/50 p-2.5 border border-border/40"
                              >
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation CTAs */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <Button
                    variant="ghost"
                    className="rounded-xl text-xs font-bold"
                    onClick={() => goToStep(1)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Role & Scope
                  </Button>
                  <Button
                    className="rounded-xl px-6 font-bold text-xs shadow-md"
                    onClick={() => goToStep(3)}
                  >
                    Next: What Market Demands & Future Tech <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Market Demands & Future Tech in Pakistan */}
            {activeStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Skill Demand Tiers */}
                <div className="card-surface p-6 sm:p-8 space-y-6 border-terracotta/15">
                  <div className="flex items-center gap-2.5">
                    <Zap className="h-5 w-5 text-terracotta" />
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">
                        Skills & Tech Stack Breakdown for {market.targetRole}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Categorized by how critical they are to passing hiring manager screens.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-secondary/35 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <Target className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" />
                      <div>
                        <h3 className="font-display text-lg font-bold text-foreground">
                          What does the market expect from you?
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          These are capabilities, not just technologies. Each one maps to the work
                          companies need done in this role.
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {market.companiesAskFor.slice(0, 6).map((category) => (
                        <div
                          key={category.label}
                          className="rounded-xl border border-border bg-card p-4"
                        >
                          <p className="text-xs font-bold text-foreground">{category.label}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            Companies look for this because it helps you ship reliable work,
                            collaborate clearly, and solve problems beyond a tutorial.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {category.items.slice(0, 4).map((item) => (
                              <span
                                key={item}
                                className="rounded-lg bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-terracotta/20 bg-terracotta/5 p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-terracotta" />
                      <h3 className="font-display text-lg font-bold text-foreground">
                        What should you learn first?
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Prioritized from the highest-demand gaps in your current profile.
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {[...market.skillDemand.high, ...market.skillDemand.common]
                        .slice(0, 6)
                        .map((skill, index) => {
                          const added = roadmapItems.includes(skill);
                          return (
                            <div
                              key={skill}
                              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                            >
                              <span className="text-xs font-black text-terracotta">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="min-w-0 flex-1 text-xs font-bold text-foreground">
                                {skill}
                                <span className="ml-2 text-[10px] font-medium text-muted-foreground">
                                  {index < 2 ? "Critical" : "High"}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => addToRoadmap(skill)}
                                className={cn(
                                  "shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors",
                                  added
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-terracotta/30 text-terracotta hover:bg-terracotta/10",
                                )}
                              >
                                {added ? "✓ Added" : "+ Add to Roadmap"}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {/* High Demand / Crucial */}
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/30 dark:bg-rose-950/20 dark:border-rose-900/40 p-5">
                      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                        <Flame className="h-4 w-4" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">
                          Crucial / Non-Negotiable
                        </h3>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Missing one causes immediate screen-out:
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {market.skillDemand.high.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg bg-card border border-rose-200 dark:border-rose-900/50 px-2.5 py-1 text-xs font-bold text-rose-800 dark:text-rose-300 shadow-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Common Demand */}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900/40 p-5">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        <Layers className="h-4 w-4" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">
                          Commonly Expected
                        </h3>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Expected in 60%+ of entry-to-mid postings:
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {market.skillDemand.common.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg bg-card border border-amber-200 dark:border-amber-900/50 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-300 shadow-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Differentiators */}
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-5">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <Sparkles className="h-4 w-4" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">
                          Standout Differentiators
                        </h3>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Puts you in the top 5% of candidates:
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {market.skillDemand.roleSpecific.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg bg-card border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-300 shadow-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Future Technology in Pakistan & Emerging Trends */}
                  <div className="card-surface p-6 sm:p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />
                    <div className="flex items-center gap-2.5 relative z-10">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                        <Cpu className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-bold text-foreground">
                          Future Technology Trends in Pakistan (2025–2026)
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Technologies gaining velocity vs declining legacy tools in Pakistan's
                          software industry.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 relative z-10">
                      {/* Rising / Emerging in Pakistan */}
                      <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-950/20 p-6 shadow-lg shadow-emerald-500/5">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                              <TrendingUp className="h-4 w-4" />
                            </div>
                            <h3 className="text-sm font-bold tracking-tight">High-Growth Tech</h3>
                          </div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600/60">
                            Adoption Velocity
                          </span>
                        </div>
                        <div className="space-y-3">
                          {[
                            {
                              name: "Next.js 15 & Server Components",
                              desc: "Standard for high-performance React.",
                              score: 95,
                            },
                            {
                              name: "FastAPI & Python AI Microservices",
                              desc: "Surging demand for AI backend integration.",
                              score: 90,
                            },
                            {
                              name: "pgvector (PostgreSQL)",
                              desc: "Replacing traditional DBs for smart search.",
                              score: 85,
                            },
                            {
                              name: "Docker & Microservices",
                              desc: "Mandatory standard in enterprise deploys.",
                              score: 80,
                            },
                            {
                              name: "Flutter Cross-Platform",
                              desc: "Preferred for cost-effective mobile launches.",
                              score: 75,
                            },
                          ].map((item, i) => (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 * i, duration: 0.4 }}
                              key={item.name}
                              className="group relative overflow-hidden rounded-2xl bg-white/60 dark:bg-card/60 p-3.5 border border-emerald-500/10 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-xs font-bold text-emerald-950 dark:text-emerald-100 group-hover:text-emerald-700 transition-colors">
                                    {item.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {item.desc}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">
                                  +{item.score}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-emerald-100 dark:bg-emerald-950 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.score}%` }}
                                  transition={{ duration: 1, delay: 0.2 + 0.1 * i }}
                                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                                />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Declining / Outdated Stacks */}
                      <div className="rounded-3xl border border-rose-500/20 bg-gradient-to-b from-rose-50/50 to-transparent dark:from-rose-950/20 p-6 shadow-lg shadow-rose-500/5">
                        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 mb-5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50">
                            <TrendingDown className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-bold tracking-tight">
                            Declining / Low-Value
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {[
                            {
                              name: "Legacy PHP (CodeIgniter)",
                              desc: "Declining budgets; low salary caps.",
                            },
                            {
                              name: "jQuery / Plain HTML/CSS",
                              desc: "Dismissed by modern employers.",
                            },
                            {
                              name: "C++ Without Modern Standards",
                              desc: "Limited entry-level software house openings.",
                            },
                            {
                              name: "Un-typed JavaScript (Large Apps)",
                              desc: "Enterprise teams mandate strict TypeScript.",
                            },
                          ].map((item, i) => (
                            <motion.div
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 * i, duration: 0.4 }}
                              key={item.name}
                              className="group flex items-start gap-3 rounded-2xl bg-white/60 dark:bg-card/60 p-3.5 border border-rose-500/10 hover:border-rose-500/30 transition-all"
                            >
                              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600">
                                <AlertCircle className="h-3 w-3" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-rose-950 dark:text-rose-100">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {item.desc}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Impact Callout */}
                  {market.aiImpact && (
                    <div className="rounded-2xl bg-gradient-to-r from-ink via-neutral-900 to-neutral-800 p-5 text-white shadow-lg border border-terracotta/20">
                      <div className="flex items-center gap-2 text-terracotta">
                        <Sparkles className="h-4 w-4" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">
                          How AI Transforms Entry-Level Hiring
                        </h3>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-white/80">
                        Employers now expect junior engineers to use AI code assistants for
                        boilerplate, freeing them up to focus on{" "}
                        <strong>
                          system architecture, database optimization, edge-case debugging, and
                          security
                        </strong>
                        .
                      </p>
                    </div>
                  )}
                </div>

                {/* Navigation CTAs */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <Button
                    variant="ghost"
                    className="rounded-xl text-xs font-bold"
                    onClick={() => goToStep(2)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hiring Reality
                  </Button>
                  <Button
                    className="rounded-xl px-6 font-bold text-xs shadow-md"
                    onClick={() => goToStep(4)}
                  >
                    Next: See Where You Stand vs 100% Market Bar{" "}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Your Real Standing vs 100% Market Bar */}
            {activeStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="card-surface p-6 sm:p-8 space-y-6 border-terracotta/15">
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="h-5 w-5 text-terracotta" />
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">
                        Your Standing: Profile vs 100% Market Competitiveness
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Holding your current bio, recorded skills, and project proof against actual
                        employer demand.
                      </p>
                    </div>
                  </div>

                  {/* Dual Market Readiness Meters */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(marketScope === "both" || marketScope === "pakistan") && (
                      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground">Local Market Standing</p>
                          <span className="text-sm font-black text-terracotta">
                            {localMatchPct}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-2.5 rounded-full bg-terracotta transition-all"
                            style={{ width: `${localMatchPct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {localMatchPct >= 70
                            ? "Competitive for technical screening rounds at mid-to-top tier software houses."
                            : "High risk of screening rejection due to unverified project proof."}
                        </p>
                      </div>
                    )}

                    <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground">Global Market Standing</p>
                        <span className="text-sm font-black text-emerald-700">
                          {globalMatchPct}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-2.5 rounded-full bg-emerald-600 transition-all"
                          style={{ width: `${globalMatchPct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Worldwide employers require demonstrated autonomous deployment, testing, and
                        public code walkthroughs.
                      </p>
                    </div>
                  </div>

                  {/* Skill Match Breakdown */}
                  <div className="grid gap-4 md:grid-cols-2 pt-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-5 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Skills You Have Matched ({matchedHighSkills.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {matchedHighSkills.length > 0 ? (
                          matchedHighSkills.map((s) => (
                            <span
                              key={s}
                              className="rounded-lg bg-card border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-300 shadow-xs"
                            >
                              ✓ {s}
                            </span>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No high-demand skills verified yet.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-rose-200 bg-rose-50/30 dark:bg-rose-950/20 dark:border-rose-900/40 p-5 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                        Critical Skills You Need to Build (
                        {highDemandSkills.filter((s) => !matchedHighSkills.includes(s)).length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {highDemandSkills
                          .filter((s) => !matchedHighSkills.includes(s))
                          .map((s) => (
                            <span
                              key={s}
                              className="rounded-lg bg-card border border-rose-200 dark:border-rose-900/50 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:text-rose-300 shadow-xs"
                            >
                              ! {s}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Outdated Tech Alert (if any) */}
                  {outdatedData && outdatedData.outdatedItems.length > 0 && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-900/50 p-4 text-xs text-amber-900 dark:text-amber-200">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>Outdated / Declining Market Reality</span>
                      </div>
                      <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                        Live market research found signals worth reviewing for {market.targetRole}.
                        A flagged skill is not automatically dead; use the replacement and evidence
                        to decide where to invest your time.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {outdatedData.outdatedItems.slice(0, 6).map((item) => (
                          <div
                            key={item.skill}
                            className="rounded-xl border border-amber-200 bg-white/60 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold">{item.skill}</span>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase">
                                {item.status === "at_risk" ? "At risk" : item.status}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed">
                              {item.reason || item.evidence}
                            </p>
                            {item.replacement && (
                              <p className="mt-2 font-semibold text-emerald-800">
                                Better next focus: {item.replacement}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation CTAs */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <Button
                    variant="ghost"
                    className="rounded-xl text-xs font-bold"
                    onClick={() => goToStep(3)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Market Demands
                  </Button>
                  <Button
                    className="rounded-xl px-6 font-bold text-xs shadow-md"
                    onClick={() => goToStep(5)}
                  >
                    Next: See 100% Market-Ready Blueprint & Salaries{" "}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: 100% Market-Ready Blueprint & Salaries */}
            {activeStep === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="rounded-3xl border border-ink/10 bg-ink p-6 text-white shadow-xl sm:p-8">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-terracotta">
                        Reality check
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-black tracking-tight sm:text-3xl">
                        You do not need to learn everything.
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                        You need to learn what this market actually values. Stop over-investing in
                        disconnected tutorials and certificate collecting; prioritize one relevant
                        stack, real project proof, testing, deployment, and clear communication.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Salary Benchmarks Card */}
                <div className="card-surface p-6 sm:p-8 space-y-6 border-terracotta/15">
                  <div className="flex items-center gap-2.5">
                    <DollarSign className="h-5 w-5 text-terracotta" />
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">
                        Real Market Salary Benchmarks for {market.targetRole}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Global compensation bands with optional localized context.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Optional localized salaries */}
                    {(marketScope === "both" || marketScope === "pakistan") && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                            Localized market benchmark
                          </p>
                          <Building2 className="h-4 w-4 text-emerald-700" />
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between rounded-xl bg-card p-3 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                            <span className="text-muted-foreground">
                              Entry-Level Trainee / Associate:
                            </span>
                            <span className="font-bold text-foreground">
                              {market.salaryInsights?.entryLevel || "65,000 – 120,000 PKR"}
                            </span>
                          </div>
                          <div className="flex justify-between rounded-xl bg-card p-3 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                            <span className="text-muted-foreground">
                              Mid-Level Software Engineer (2-4 yrs):
                            </span>
                            <span className="font-bold text-foreground">
                              {market.salaryInsights?.midLevel || "160,000 – 320,000 PKR"}
                            </span>
                          </div>
                          <div className="flex justify-between rounded-xl bg-card p-3 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                            <span className="text-muted-foreground">Top-Tier / Senior / Lead:</span>
                            <span className="font-bold text-foreground">
                              {market.salaryInsights?.seniorLevel || "400,000 – 750,000+ PKR"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Global Remote Salaries */}
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                          Global compensation (USD/mo)
                        </p>
                        <Globe className="h-4 w-4 text-emerald-700" />
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between rounded-xl bg-card p-3 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                          <span className="text-muted-foreground">Junior Remote Engineer:</span>
                          <span className="font-bold text-foreground">
                            {"$1,200 – $2,200/mo (~350k–650k PKR)"}
                          </span>
                        </div>
                        <div className="flex justify-between rounded-xl bg-card p-3 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                          <span className="text-muted-foreground">Mid-Level Remote Engineer:</span>
                          <span className="font-bold text-foreground">
                            {"$2,500 – $4,500/mo (~700k–1.3M PKR)"}
                          </span>
                        </div>
                        <div className="flex justify-between rounded-xl bg-card p-3 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                          <span className="text-muted-foreground">
                            Senior / Staff Remote Engineer:
                          </span>
                          <span className="font-bold text-foreground">
                            {"$5,000 – $8,500+/mo (~1.4M–2.4M+ PKR)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* The 4-Stage Action Blueprint to Reach 100% Market Standing */}
                <div className="card-surface border-terracotta/30 p-6 sm:p-8 space-y-6 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <Rocket className="h-6 w-6 text-terracotta" />
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">
                        The 4-Stage Action Blueprint to Reach 100% Market Standing
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Execute this roadmap to become 100% competitive for top software houses and
                        remote global roles.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        stage: "Stage 1",
                        title: "Core Non-Negotiables",
                        desc: "Eliminate outdated stacks. Master TypeScript, clean OOP/Design patterns, and relational DB indexing.",
                      },
                      {
                        stage: "Stage 2",
                        title: "Flagship Production Project",
                        desc: "Build a production-grade full-stack app with role-based auth, caching, and automated unit test suite.",
                      },
                      {
                        stage: "Stage 3",
                        title: "Docker & Cloud Deployment",
                        desc: "Containerize your codebase and deploy live on cloud (Vercel/AWS/Render) with public Swagger documentation.",
                      },
                      {
                        stage: "Stage 4",
                        title: "DSA & Global Outreach",
                        desc: "Solve 50+ LeetCode Easy/Medium problems and apply directly with live demo links and video walkthroughs.",
                      },
                    ].map((s) => (
                      <div
                        key={s.stage}
                        className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-xs"
                      >
                        <span className="rounded-md bg-terracotta/10 px-2 py-0.5 text-[10px] font-bold text-terracotta">
                          {s.stage}
                        </span>
                        <h3 className="text-xs font-bold text-foreground">{s.title}</h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {s.desc}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                    <Button
                      className="h-12 rounded-xl px-6 text-xs font-bold shadow-lg bg-terracotta hover:bg-terracotta/90 text-white"
                      disabled={generateRoadmap.isPending}
                      onClick={handleGenerateRoadmap}
                    >
                      {generateRoadmap.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building Career
                          Roadmap...
                        </>
                      ) : (
                        <>
                          <Map className="mr-2 h-4 w-4" />
                          Build This 100% Blueprint in My Career Roadmap →
                        </>
                      )}
                    </Button>

                    {generatedSuccess ? (
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl px-6 text-xs font-bold border-terracotta text-terracotta hover:bg-terracotta/10"
                        onClick={() => navigate({ to: "/roadmap" })}
                      >
                        <Sparkles className="mr-1.5 h-4 w-4" /> View Your Generated Roadmap →
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl px-6 text-xs font-bold border-border"
                        onClick={() => navigate({ to: "/diagnosis" })}
                      >
                        <ShieldAlert className="mr-1.5 h-4 w-4 text-terracotta" />
                        Run Company-Specific Diagnosis
                      </Button>
                    )}
                  </div>
                </div>

                {/* Individual expert synthesis: the final answer to "what does this mean for me?" */}
                <div className="relative overflow-hidden rounded-3xl border border-terracotta/25 bg-gradient-to-br from-[#fffaf5] via-card to-terracotta/5 p-6 shadow-lift sm:p-8">
                  <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-terracotta/10 blur-3xl" />
                  <div className="relative">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
                          <Sparkles className="h-5 w-5 text-terracotta" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-terracotta">
                            Expert market opinion
                          </p>
                          <h2 className="mt-1 font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                            Your {market.targetRole} decision brief
                          </h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Personalized from your saved profile, this target's demand signals, and
                            the latest outdated-skill check.
                          </p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-terracotta/20 bg-card px-4 py-3 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Current position
                        </p>
                        <p className="mt-1 text-sm font-black text-terracotta">{positionLabel}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                      <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 lg:flex-none">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <input
                          value={opinionSearch}
                          onChange={(event) => setOpinionSearch(event.target.value)}
                          placeholder="Find in your opinion..."
                          className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                        />
                      </label>
                      <Button
                        variant="outline"
                        className="rounded-xl text-xs font-bold"
                        onClick={() => {
                          window.print();
                          toast("Use the print dialog to save this assessment as a PDF.");
                        }}
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5 text-terracotta" /> Export Opinion
                      </Button>
                    </div>
                    {opinionSearch.trim() && (
                      <div className="mt-3 rounded-xl border border-terracotta/20 bg-terracotta/5 px-4 py-3 text-xs text-muted-foreground">
                        Searching this assessment for{" "}
                        <strong className="text-foreground">{opinionSearch}</strong>. Review the
                        market reality, strengths, gaps, and recommended actions below.
                      </div>
                    )}

                    <div className="mt-7 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <OpinionBlock
                        label="Market reality"
                        tone="dark"
                        text={`${market.targetRole} is judged by ${market.skillDemand.high.slice(0, 2).join(" and ") || "core job capability"}, plus visible proof that you can apply it in real work.`}
                      />
                      <OpinionBlock
                        label="What you have"
                        tone="good"
                        text={
                          profileSkills.length
                            ? `Your profile currently shows ${profileSkills.join(", ")}. These are useful foundations, but skills alone are not yet proof of employability.`
                            : "Your profile has no recorded skills yet, so start by adding the tools and capabilities you already use."
                        }
                      />
                      <OpinionBlock
                        label="What is missing"
                        tone="gap"
                        text={
                          criticalGaps.length
                            ? `Your highest-priority gaps are ${criticalGaps.slice(0, 3).join(", ")}. Close these before spreading effort across more tools.`
                            : "Your recorded skills cover the main demand signals. Your next gap is likely stronger project proof and production practice."
                        }
                      />
                      <OpinionBlock
                        label="What to do next"
                        tone="accent"
                        text={`For the next 30 days, focus on ${roadmapItems[0] || criticalGaps[0] || "one production-quality project"}, then prove it through a deployed result, tests, and a clear explanation.`}
                      />
                    </div>

                    <div className="mt-5 grid gap-4 border-t border-border pt-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          If you apply today
                        </p>
                        <p className="mt-1 text-sm font-bold text-foreground">
                          {localMatchPct < 60
                            ? "Expect a high screening risk until your critical gaps have evidence."
                            : "You can compete for selected junior opportunities, especially where your proof is strongest."}
                        </p>
                      </div>
                      <ArrowRight className="hidden h-5 w-5 text-terracotta md:block" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          After closing the critical gaps
                        </p>
                        <p className="mt-1 text-sm font-bold text-foreground">
                          {globalMatchPct >= 65
                            ? "Competitive junior locally, with a credible path toward remote work."
                            : "A stronger competitive junior profile with better access to local and remote interviews."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-terracotta">
                        Your recommended path
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-foreground">
                        What you should do now
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        A short sequence based on this target's demand, dependencies, and your
                        current gaps.
                      </p>
                      <div className="mt-4 space-y-2">
                        {(criticalGaps.length
                          ? criticalGaps
                          : [
                              "Production-quality project",
                              "Testing and deployment",
                              "Portfolio evidence",
                            ]
                        )
                          .slice(0, 4)
                          .map((action, index) => {
                            const added = roadmapItems.includes(action);
                            return (
                              <div
                                key={action}
                                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/35 p-3"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-terracotta text-[10px] font-black text-white">
                                  {index + 1}
                                </span>
                                <div className="min-w-[180px] flex-1">
                                  <p className="text-xs font-bold text-foreground">{action}</p>
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    Learn from official documentation plus a project-based course,
                                    then prove it in a real {market.targetRole} project.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addToRoadmap(action)}
                                  className={cn(
                                    "rounded-lg border px-3 py-1.5 text-[10px] font-bold",
                                    added
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-terracotta/30 text-terracotta hover:bg-terracotta/10",
                                  )}
                                >
                                  {added ? "✓ Added to Roadmap" : "+ Add to Roadmap"}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
                      <EvidenceNote
                        label="Strong evidence"
                        text="Your saved skills and this target's repeated market requirements."
                        tone="good"
                      />
                      <EvidenceNote
                        label="Recommended"
                        text="The priority sequence is based on your visible gaps and skill dependencies."
                        tone="accent"
                      />
                      <EvidenceNote
                        label="Watch out"
                        text="Salary and remote-readiness vary by employer, location, and proof quality."
                        tone="warn"
                      />
                    </div>

                    <div className="mt-5 rounded-2xl bg-ink p-5 text-white sm:p-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-terracotta">
                        Bottom line
                      </p>
                      <p className="mt-3 text-sm leading-7 text-white/80">
                        You are currently a <strong className="text-white">{positionLabel}</strong>{" "}
                        for {market.targetRole}. Your market fit is {localMatchPct}% locally and{" "}
                        {globalMatchPct}% against the higher global bar; the biggest risk is{" "}
                        {criticalGaps[0] || "not yet having enough production proof"}. Prioritize
                        one focused learning sequence and show it through a deployed, documented
                        project. Your next priority:{" "}
                        <strong className="text-white">
                          {roadmapItems[0] ||
                            criticalGaps[0] ||
                            `build one production-level ${market.targetRole} project`}
                          .
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation CTAs */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <Button
                    variant="ghost"
                    className="rounded-xl text-xs font-bold"
                    onClick={() => goToStep(4)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Your Standing
                  </Button>
                  <Button
                    className="rounded-xl px-6 font-bold text-xs shadow-md"
                    onClick={() => goToStep(6)}
                  >
                    Continue to Expert Opinion <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl text-xs font-bold"
                    onClick={() => goToStep(1)}
                  >
                    Return to Step 1 (Role & Scope)
                  </Button>
                </div>
              </motion.div>
            )}
            {activeStep === 6 && (
              <motion.section
                ref={expertOpinionRef}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-surface overflow-hidden border-terracotta/25 shadow-lift"
              >
                <div className="bg-ink p-6 text-white sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-terracotta text-white">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-terracotta">
                          Step 6 · Expert Opinion
                        </p>
                        <h2 className="mt-2 font-display text-2xl font-black tracking-tight sm:text-3xl">
                          What should you do now?
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                          A concise professional verdict based on your {market.targetRole} target,
                          saved skills, market demand, and current gaps.
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                        Market fit
                      </p>
                      <p className="mt-1 text-2xl font-black text-terracotta">{localMatchPct}%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-5 sm:p-8">
                  <div className="rounded-2xl border border-terracotta/20 bg-terracotta/5 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-terracotta">
                      Expert verdict
                    </p>
                    <p className="mt-3 text-base font-semibold leading-7 text-foreground">
                      You are currently a <strong>{positionLabel}</strong> for {market.targetRole}.
                      Your foundations are useful, but employers will need stronger evidence that
                      you can apply them in real work. Your fastest improvement is to close{" "}
                      <strong>{criticalGaps[0] || "your production-proof gap"}</strong> through one
                      focused, deployed project.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <OpinionBlock
                      label="Biggest strength"
                      tone="good"
                      text={
                        profileSkills.length
                          ? `${profileSkills[0]} gives you a relevant starting point for this target.`
                          : "You have a clear target, which gives your learning a useful direction."
                      }
                    />
                    <OpinionBlock
                      label="Biggest gap"
                      tone="gap"
                      text={
                        criticalGaps[0]
                          ? `${criticalGaps[0]} is the first gap to close because it appears in the core demand signals.`
                          : "Project depth and production proof are your highest-leverage next improvements."
                      }
                    />
                    <OpinionBlock
                      label="Watch out"
                      tone="accent"
                      text={
                        firstOutdatedItem
                          ? `${firstOutdatedItem.skill} is showing an ${firstOutdatedItem.status} signal. Keep the fundamentals, but update how you use it.`
                          : "Do not spread yourself across too many tools before proving one relevant stack."
                      }
                    />
                  </div>

                  <div className="border-t border-border pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-terracotta">
                          Recommended path
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-foreground">
                          Your next three moves
                        </h3>
                      </div>
                      <Button
                        variant="outline"
                        className="rounded-xl text-xs font-bold"
                        onClick={() => {
                          window.print();
                          toast("Use the print dialog to save your Expert Opinion as a PDF.");
                        }}
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5 text-terracotta" />
                        Export Expert Opinion
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {(criticalGaps.length
                        ? criticalGaps
                        : ["Build production proof", "Testing and deployment", "Portfolio quality"]
                      )
                        .slice(0, 3)
                        .map((action, index) => (
                          <div
                            key={action}
                            className="rounded-xl border border-border bg-secondary/35 p-4"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-terracotta text-[10px] font-black text-white">
                                {index + 1}
                              </span>
                              <p className="text-xs font-bold text-foreground">{action}</p>
                            </div>
                            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                              Learn from official documentation and a practical project-based
                              course. Reach the point where you can demonstrate it in a real{" "}
                              {market.targetRole} project.
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                    <Button
                      variant="ghost"
                      className="rounded-xl text-xs font-bold"
                      onClick={() => goToStep(5)}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Blueprint
                    </Button>
                    <Button
                      className="rounded-xl text-xs font-bold"
                      onClick={() => navigate({ to: "/roadmap" })}
                    >
                      Open my Career Roadmap <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Change Target Role Modal */}
        {showRoleDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-surface w-full max-w-md p-6 sm:p-8 space-y-4 shadow-2xl border-terracotta/30"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Select Target Role
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRoleDialog(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Type any custom role or choose from popular market tracks:
              </p>

              <Input
                value={customRoleInput}
                onChange={(e) => setCustomRoleInput(e.target.value)}
                placeholder="e.g. Associate Software Engineer, Flutter Developer..."
                className="h-12 rounded-xl border-border focus:border-terracotta"
              />

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {POPULAR_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCustomRoleInput(r)}
                    className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-terracotta/10 hover:text-terracotta border border-border/50"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCustomRoleInput("I don't know my target yet")}
                className="rounded-xl border border-dashed border-terracotta/40 bg-terracotta/5 px-3 py-2 text-left text-xs font-semibold text-terracotta hover:bg-terracotta/10"
              >
                I don't know my target yet
              </button>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-xs font-bold"
                  onClick={() => setShowRoleDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl font-bold text-xs bg-terracotta hover:bg-terracotta/90 text-white shadow-md"
                  disabled={!customRoleInput.trim() || changingRole}
                  onClick={() => handleRoleChange(customRoleInput.trim())}
                >
                  {changingRole ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Apply Target Role"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function OpinionBlock({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "dark" | "good" | "gap" | "accent";
}) {
  const toneClass = {
    dark: "border-ink/15 bg-ink text-white",
    good: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
    gap: "border-rose-200 bg-rose-50/70 text-rose-950",
    accent: "border-terracotta/20 bg-terracotta/10 text-foreground",
  }[tone];

  return (
    <div className={cn("min-h-[154px] rounded-2xl border p-4", toneClass)}>
      <p
        className={cn(
          "text-[10px] font-bold uppercase tracking-[0.14em]",
          tone === "dark" ? "text-terracotta" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-3 text-xs leading-6",
          tone === "dark" ? "text-white/75" : "text-foreground/75",
        )}
      >
        {text}
      </p>
    </div>
  );
}

function EvidenceNote({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "good" | "accent" | "warn";
}) {
  const toneClass = {
    good: "border-emerald-200 bg-emerald-50/60",
    accent: "border-terracotta/20 bg-terracotta/5",
    warn: "border-amber-200 bg-amber-50/60",
  }[tone];

  return (
    <div className={cn("rounded-xl border p-3", toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">{label}</p>
      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}
