import { motion } from "motion/react";
import { Check, Search, Sparkles, UserCheck } from "lucide-react";
import diagnosisGirlLaptop from "@/assets/diagnosis-girl-laptop.png";

interface RecruiterHeroCardProps {
  targetCompany: string;
  targetRole: string;
  score?: number | null;
}

export function RecruiterHeroCard({ targetCompany, targetRole, score = null }: RecruiterHeroCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-terracotta/20 bg-gradient-to-br from-[#FAF7F2] via-card to-[#FAF7F2] p-6 sm:p-8 shadow-xl">
      {/* Background Decorative Circles */}
      <div className="pointer-events-none absolute -top-12 -left-12 h-48 w-48 rounded-full bg-terracotta/5 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-terracotta/8 blur-2xl" />

      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
        {/* Left Side: Editorial Typography & Subheadings */}
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-terracotta/30 bg-terracotta/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-terracotta">
            <Sparkles className="h-3.5 w-3.5" /> RECRUITER AI ENGINE
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
              Audit Right. <br />
              <span className="text-terracotta">Build Better.</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium leading-relaxed text-muted-foreground max-w-md pt-1">
              We analyze your resume, projects, and evidence footprint for{" "}
              <strong className="text-foreground">{targetRole}</strong> at{" "}
              <span className="font-bold text-terracotta">{targetCompany}</span> with zero flattery.
            </p>
          </div>

          {/* Quick Feature Badges (Matching Screenshot Left Sidebar) */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Smart Sourcing</p>
                <p className="text-[10px] text-muted-foreground">GitHub & Project Proof</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">CV Screening</p>
                <p className="text-[10px] text-muted-foreground">ATS Keyword Audit</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Animated Recruiter Character Frame (Directly styled like user screenshot!) */}
        <div className="relative flex items-center justify-center">
          {/* Main Rounded Box matching screenshot black outline container */}
          <div className="relative w-full max-w-[380px] rounded-3xl border-2 border-foreground/80 bg-[#FAF7F2] p-6 shadow-2xl">
            {/* Top Bubble: "Looking for a..." */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="absolute -top-4 left-6 z-20 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 shadow-md"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-terracotta text-white">
                <Search className="h-3 w-3" />
              </div>
              <div className="text-[11px] font-bold text-foreground">
                Target: <span className="text-terracotta">{targetRole.slice(0, 18)}</span>
              </div>
            </motion.div>

            {/* Floating Top Right Candidate Score Card (Jane Doe 92% style) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute -right-3 top-8 z-20 flex items-center gap-2.5 rounded-2xl border border-border bg-card p-2.5 shadow-lg"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-black text-foreground">
                CP
              </div>
              <div>
                <p className="text-[11px] font-bold text-foreground">Candidate Fit</p>
                <p className="text-[10px] font-extrabold text-terracotta">{score === null ? "Run audit first" : `${score}/100 evidence`}</p>
              </div>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
            </motion.div>

            {/* Recruiter Girl Image (Circled in user screenshot!) */}
            <div className="relative z-10 flex items-center justify-center pt-2">
              <motion.img
                src={diagnosisGirlLaptop}
                alt="Recruiter girl using laptop"
                className="h-auto w-full max-w-[260px] object-contain drop-shadow-md"
                initial={{ scale: 0.95 }}
                animate={{ scale: [0.98, 1.02, 0.98] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Bottom Laptop Label Badge matching user screenshot */}
            <div className="mt-3 flex items-center justify-between rounded-xl bg-foreground px-4 py-2 text-background shadow-md">
              <span className="text-xs font-black tracking-widest uppercase text-terracotta">RECRUITER</span>
              <span className="text-[10px] font-bold opacity-80">{targetCompany} Panel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
