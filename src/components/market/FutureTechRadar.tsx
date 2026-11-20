/**
 * Future Tech Radar (2030 horizon), Round 3 (Cursor as Flashlight /
 * Lens).
 *
 * Signature moments:
 * - A Lens over the radar banner: the title, the framing line and the
 *   target-role box lights up under the cursor. The tabs stay outside
 *   the lens (they are interactive; lens children must be static).
 * - A Flashlight inside each region card: the student opportunity is
 *   dimmed at rest and the light reveals it as a serif pull-quote plus
 *   the region's first initiative as a starting point.
 * - Tab panel headings are kinetic (scroll-linked word reveal).
 * - Region cards, model cards, shift cards and rule cards are
 *   SpotlightCards with cursor-tracked border glow.
 *
 * Presentation only: the region, model and shift content is unchanged.
 * Two honesty fixes: the banner no longer claims "Live Market
 * Intelligence / Updated Daily" (this content is curated, not live),
 * and flag emoji are replaced with mono region codes.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bot,
  Brain,
  Check,
  Compass,
  Database,
  Flame,
  Globe2,
  Plus,
  Rocket,
  ShieldCheck,
  Terminal,
  Flashlight as FlashlightIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Lens } from "@/components/lens/Lens";
import { Flashlight } from "@/components/lens/Flashlight";
import { KineticText } from "@/components/lens/KineticText";
import { MagneticButton } from "@/components/lens/MagneticButton";
import { SpotlightCard } from "@/components/lens/SpotlightCard";

export type TabId = "global_landscape" | "emerging_models" | "shifts_2030" | "master_summary";

interface CountryRegion {
  id: string;
  region: string;
  flag: string;
  roleInGlobalTech: string;
  keyInitiatives: string[];
  opportunityForStudents: string;
  badgeColor: string;
}

const GLOBAL_REGIONS: CountryRegion[] = [
  {
    id: "us",
    region: "United States (Frontier & Silicon Valley)",
    flag: "🇺🇸",
    roleInGlobalTech: "Dominates proprietary LLM pre-training, test-time compute scaling, hyperscale AI infrastructure, and autonomous SWE agents.",
    keyInitiatives: [
      "Test-Time Compute Reasoning (OpenAI o1/o3, Extended Chain-of-Thought)",
      "Universal Multimodal Real-Time Agents (Google Gemini 2.0, Project Astra)",
      "Autonomous Engineering IDEs (Cursor, Windsurf, Cognition Devin)",
      "Custom Silicon Hardware (NVIDIA Blackwell, Google TPU v6, AWS Trainium 2)",
    ],
    opportunityForStudents:
      "Master Agent Orchestration (LangGraph, AutoGen) and high-context System Design to command top-tier remote engineering compensation.",
    badgeColor: "bg-cp-lime/10 text-cp-lime border-cp-lime/25",
  },
  {
    id: "china",
    region: "China (Open-Weights & Algorithmic Efficiency)",
    flag: "🇨🇳",
    roleInGlobalTech: "Leads open-weights reasoning efficiency, low-cost Mixture-of-Experts (MoE) architectures, and rapid algorithmic innovation.",
    keyInitiatives: [
      "DeepSeek-R1 (RL-driven Open Reasoning at 1/20th traditional training cost)",
      "Alibaba Qwen 2.5 Coder (Global leader in open-weights code generation)",
      "Multi-Head Latent Attention (MLA) & DualPipe compute optimizations",
      "Edge Multimodal Models (MiniCPM, Step-Audio for mobile/on-device AI)",
    ],
    opportunityForStudents:
      "Learn open-model self-hosting (vLLM, Ollama), quantization (GGUF), and LoRA fine-tuning to deliver cost-effective enterprise AI.",
    badgeColor: "bg-cp-ember/10 text-cp-ember border-cp-ember/25",
  },
  {
    id: "eu",
    region: "European Union (Sovereign & Regulated AI)",
    flag: "🇪🇺",
    roleInGlobalTech: "Pioneers European open-source models, sovereign cloud data boundaries, and strict AI safety/governance standards.",
    keyInitiatives: [
      "Mistral AI (High-efficiency European open-source model suite)",
      "EU AI Act Compliance & Verifiable Model Governance",
      "Privacy-Preserving Federated Learning & Local Compute",
    ],
    opportunityForStudents:
      "Build expertise in AI Safety, Model Auditability, and Data Privacy Architecture required by multinational enterprises.",
    badgeColor: "bg-white/5 text-cp-stone border-white/10",
  },
  {
    id: "pakistan_asia",
    region: "Pakistan & Emerging Markets (Agentic Implementation)",
    flag: "🇵🇰",
    roleInGlobalTech: "Transitioning rapidly from low-margin IT outsourcing to high-value AI agent integration, custom software houses, and global freelance engineering.",
    keyInitiatives: [
      "Enterprise Agentic Workflows for US & Gulf Clients",
      "Model Context Protocol (MCP) Integration Services",
      "Custom Fine-Tuned AI Assistants for Niche Domains",
    ],
    opportunityForStudents:
      "Bridge local development with global AI APIs. Students who master building functional AI agents will replace traditional web agency freelancers.",
    badgeColor: "bg-cp-lime2/10 text-cp-lime2 border-cp-lime2/25",
  },
];

/** Mono region codes, shown in place of flag emoji. */
const REGION_CODES: Record<string, string> = {
  us: "US",
  china: "CN",
  eu: "EU",
  pakistan_asia: "PK",
};

interface EmergingModelParadigm {
  title: string;
  pioneerCompanies: string;
  description: string;
  keyCapability: string;
  impactOn2030: string;
  skillsToMaster: string[];
}

const EMERGING_MODELS: EmergingModelParadigm[] = [
  {
    title: "Test-Time Compute & Reasoning Models",
    pioneerCompanies: "OpenAI (o1/o3), DeepSeek (R1)",
    description:
      "Rather than generating instant tokens, models perform internal search tree reasoning and self-verification before outputting answers.",
    keyCapability: "Complex mathematical proofs, bug-free code refactoring, system architecture analysis.",
    impactOn2030: "Eliminates basic coding errors; shifts developer focus from writing syntax to writing specifications.",
    skillsToMaster: ["Spec-Driven Prompting", "Chain-of-Thought Verification", "System Boundary Definition"],
  },
  {
    title: "Universal Real-Time Multimodal Agents",
    pioneerCompanies: "Google DeepMind (Gemini 2.0 / Astra), Anthropic (Computer Use)",
    description:
      "Agents that continuously process audio, video, and screen pixels simultaneously to take real-time GUI and OS actions.",
    keyCapability: "Autonomous web browsing, operating system GUI control, real-time voice pairing.",
    impactOn2030: "Traditional static web dashboards replaced by dynamic, voice-and-vision interactive agents.",
    skillsToMaster: ["WebSockets Streaming", "Generative UI (Vercel AI SDK)", "Agent Action Sandboxing"],
  },
  {
    title: "Open-Weights Mixture-of-Experts (MoE)",
    pioneerCompanies: "DeepSeek (V3), Alibaba (Qwen 2.5), Mistral",
    description:
      "High-parameter models where only a fraction of specialized subnetworks activate per token, drastically reducing inference cost.",
    keyCapability: "Enterprise-grade performance at sub-cent query costs on local or private cloud infrastructure.",
    impactOn2030: "Every business will run private, specialized open models tailored to their domain.",
    skillsToMaster: ["vLLM / SGLang Serving", "LoRA Fine-Tuning", "GPU Memory Optimization (AWQ/GGUF)"],
  },
  {
    title: "Model Context Protocol (MCP) Ecosystems",
    pioneerCompanies: "Anthropic, Linux Foundation, Open Source Community",
    description:
      "An open standard that exposes databases, APIs, and file systems to AI models in a unified, secure protocol.",
    keyCapability: "Plug-and-play AI integration across databases, GitHub repositories, and internal tools.",
    impactOn2030: "Replaces custom API integration code with universal MCP server connections.",
    skillsToMaster: ["MCP Server Authoring", "JSON-RPC Protocols", "API Security Boundaries"],
  },
];

const PARADIGM_SHIFTS_2030 = [
  {
    icon: Bot,
    title: "From 'Line-by-Line Syntax Coding' ➔ 'Agent Swarm Supervision'",
    currentEra: "Manually typing React components, writing CRUD APIs line by line.",
    era2030: "Defining architecture contracts, supervising autonomous agent swarms, and validating PRs with automated verification.",
    criticalSkill: "System Architecture, Spec-Driven Development, Agent Protocols",
  },
  {
    icon: Terminal,
    title: "From 'Isolated Custom APIs' ➔ 'Model Context Protocol (MCP)'",
    currentEra: "Hardcoding proprietary REST endpoints for every third-party integration.",
    era2030: "Standardized MCP servers enabling any AI model to dynamically discover and use enterprise tools safely.",
    criticalSkill: "MCP Protocol, Tool Calling, Secure Sandboxing",
  },
  {
    icon: Database,
    title: "From 'Static SQL Databases' ➔ 'Graph-Vector Hybrid RAG'",
    currentEra: "Relational queries with basic keyword searching.",
    era2030: "Hybrid Knowledge Graphs combined with high-dimensional vector embeddings and real-time memory caches.",
    criticalSkill: "pgvector, GraphRAG, Hybrid Search Ranking",
  },
  {
    icon: ShieldCheck,
    title: "From 'Manual QA Testing' ➔ 'Self-Healing CI/CD Pipelines'",
    currentEra: "Writing manual unit tests after code is finished.",
    era2030: "Autonomous agents generate synthetic test suites, run fuzzing, detect vulnerabilities, and auto-patch regressions.",
    criticalSkill: "Playwright / Vitest, Synthetic Data Generation, Security Auditing",
  },
];

interface FutureTechRadarProps {
  targetRole: string;
  onAddToRoadmap?: (skillName: string) => void;
  roadmapItems?: string[];
}

export function FutureTechRadar({
  targetRole,
  onAddToRoadmap,
  roadmapItems = [],
}: FutureTechRadarProps) {
  const [activeTab, setActiveTab] = useState<TabId>("global_landscape");

  const handleAddSkill = (skill: string) => {
    if (onAddToRoadmap) {
      onAddToRoadmap(skill);
    } else {
      toast.success(`"${skill}" added to your target career blueprint!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* GLOBAL TECH TRENDS BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-cp-lime/25 bg-cp-panel p-7 text-cp-paper sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-cp-lime/10 blur-[90px]" />

        {/* Lens over the banner: title, framing line and target-role box
            lights up under the cursor. Tabs stay outside (interactive). */}
        <Lens className="relative z-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cp-lime/40 bg-cp-lime/10 px-3.5 py-1 font-mono text-[11px] font-medium text-cp-lime">
                <Flame className="h-3.5 w-3.5" /> Global Tech Industry Intelligence · 2026–2030 Horizon
              </div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                The 2030 Tech Industry Radar
              </h2>
              <p className="text-[13.5px] leading-relaxed text-cp-stone">
                Explore how global regions (US, China, EU, Pakistan) are shaping the software landscape, what AI model paradigms are emerging, and what skills students must master to lead the next era.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[12.5px]">
              <div className="flex items-center gap-2 font-semibold text-cp-lime">
                <Compass className="h-4 w-4" /> Curated industry intelligence
              </div>
              <p className="text-cp-stone text-[11.5px]">Target Role: <strong className="text-cp-paper">{targetRole}</strong></p>
              <p className="font-mono text-[11px] text-cp-stone/70">Research lenses · 2026 → 2030</p>
            </div>
          </div>
        </Lens>

        {/* TABS NAVIGATION */}
        <div className="relative z-10 mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-6">
          {[
            { id: "global_landscape", label: "Global Regions & Geopolitics", icon: Globe2 },
            { id: "emerging_models", label: "Emerging AI Model Paradigms", icon: Brain },
            { id: "shifts_2030", label: "2030 Paradigm Shifts", icon: Rocket },
            { id: "master_summary", label: "Student Master Summary & Action Plan", icon: Compass },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-[12px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-cp-lime text-cp-ink"
                    : "bg-white/5 text-cp-stone hover:bg-white/10 hover:text-cp-paper"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT AREAS */}
      <AnimatePresence mode="wait">
        {/* TAB 1: GLOBAL REGIONS & GEOPOLITICS */}
        {activeTab === "global_landscape" && (
          <motion.div
            key="global_landscape"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="pb-7 font-display text-lg font-bold text-cp-paper">
                    <KineticText text="Global Tech Landscape Breakdown" />
                  </h3>
                  <p className="text-[13px] text-cp-stone mt-1">
                    How leading tech nations and regions are shaping the global software economy.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {GLOBAL_REGIONS.map((reg) => (
                  <SpotlightCard
                    key={reg.id}
                    className="flex flex-col justify-between rounded-3xl border border-white/10 bg-cp-ink p-6"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cp-lime/10 font-mono text-[12px] font-bold text-cp-lime">
                          {REGION_CODES[reg.id] ?? reg.id.toUpperCase().slice(0, 2)}
                        </span>
                        <span className={cn("rounded-md border px-2.5 py-1 font-mono text-[11px] font-medium", reg.badgeColor)}>
                          {reg.id.toUpperCase()} Region
                        </span>
                      </div>
                      <h4 className="mt-4 text-[16px] font-bold text-cp-paper">{reg.region}</h4>
                      <p className="mt-2 text-[13px] leading-relaxed text-cp-stone">
                        {reg.roleInGlobalTech}
                      </p>

                      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-cp-lime">
                          Key Regional Initiatives:
                        </span>
                        <ul className="space-y-1.5">
                          {reg.keyInitiatives.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-[12px] text-cp-stone">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* The opportunity, under the light: dimmed at rest,
                        the flashlight reveals it as a serif pull-quote.
                        The lit column is narrow on purpose: the light
                        pool is only ~280px wide, so full-width prose
                        would clip mid-word at its edge. The base box
                        carries a min-height so the taller lit column
                        never clips top or bottom. */}
                    <div
                      className="mt-5 rounded-2xl border border-white/10 bg-cp-panel p-3.5"
                      data-proof={reg.id === "us" ? "region-opportunity-0" : undefined}
                    >
                      <Flashlight
                        lit={
                          <div className="mx-auto w-full max-w-[240px] px-1 py-1">
                            <p className="flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-cp-lime">
                              <FlashlightIcon className="h-3.5 w-3.5" /> Student opportunity
                            </p>
                            <p className="mt-2 font-serif text-[14px] italic leading-relaxed text-cp-paper">
                              {reg.opportunityForStudents}
                            </p>
                          </div>
                        }
                      >
                        <div className="flex min-h-[190px] flex-col justify-center px-1 py-1">
                          <p className="text-[11.5px] font-semibold text-cp-paper">Student Opportunity:</p>
                          <p className="mt-1 text-[12px] text-cp-stone leading-relaxed">
                            {reg.opportunityForStudents}
                          </p>
                        </div>
                      </Flashlight>
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: EMERGING AI MODEL PARADIGMS */}
        {activeTab === "emerging_models" && (
          <motion.div
            key="emerging_models"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
              <h3 className="pb-7 font-display text-lg font-bold text-cp-paper">
                <KineticText text="Emerging AI Model Paradigms" />
              </h3>
              <p className="text-[13px] text-cp-stone mt-1">
                The core model architectures driving the next decade of software engineering.
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {EMERGING_MODELS.map((model) => (
                  <SpotlightCard key={model.title} className="flex flex-col justify-between rounded-3xl border border-white/10 bg-cp-ink p-6">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-cp-lime">
                          Pioneers: {model.pioneerCompanies}
                        </span>
                      </div>
                      <h4 className="mt-3 text-[16px] font-bold text-cp-paper">{model.title}</h4>
                      <p className="mt-2 text-[13px] leading-relaxed text-cp-stone">
                        {model.description}
                      </p>

                      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                        <p className="text-[12px] text-cp-stone">
                          <strong className="text-cp-paper">Key Capability:</strong> {model.keyCapability}
                        </p>
                        <p className="text-[12px] text-cp-stone">
                          <strong className="text-cp-paper">2030 Industry Impact:</strong> {model.impactOn2030}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-cp-stone">Skills to Master:</span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {model.skillsToMaster.map((sk) => {
                          const isSaved = roadmapItems.includes(sk);
                          return (
                            <button
                              type="button"
                              key={sk}
                              onClick={() => handleAddSkill(sk)}
                              className={cn(
                                "flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-[11.5px] font-medium transition",
                                isSaved
                                  ? "bg-cp-lime/15 text-cp-lime"
                                  : "bg-cp-lime/10 text-cp-lime hover:bg-cp-lime hover:text-cp-ink"
                              )}
                            >
                              {isSaved ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                              {sk}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: 2030 PARADIGM SHIFTS */}
        {activeTab === "shifts_2030" && (
          <motion.div
            key="shifts_2030"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
              <h3 className="pb-7 font-display text-lg font-bold text-cp-paper">
                <KineticText text="2030 Industry Paradigm Shifts" />
              </h3>
              <p className="text-[13px] text-cp-stone mt-1">
                How everyday software engineering contracts are evolving over the next 5 years.
              </p>

              <div className="mt-6 space-y-4">
                {PARADIGM_SHIFTS_2030.map((shift) => {
                  const Icon = shift.icon;
                  return (
                    <SpotlightCard key={shift.title} className="rounded-3xl border border-white/10 bg-cp-ink p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-lime/10 text-cp-lime">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-2 flex-1">
                          <h4 className="text-[16px] font-bold text-cp-paper">{shift.title}</h4>
                          <div className="grid gap-3 sm:grid-cols-2 text-[13px]">
                            <div className="rounded-2xl bg-rose-500/5 border border-rose-500/10 p-3">
                              <span className="font-mono text-[11px] font-bold text-rose-400 uppercase">Current Era</span>
                              <p className="mt-1 text-cp-stone">{shift.currentEra}</p>
                            </div>
                            <div className="rounded-2xl bg-cp-lime/5 border border-cp-lime/20 p-3">
                              <span className="font-mono text-[11px] font-bold text-cp-lime uppercase">2030 Standard</span>
                              <p className="mt-1 text-cp-stone">{shift.era2030}</p>
                            </div>
                          </div>
                          <div className="pt-2 text-[12px] font-semibold text-cp-lime">
                            Critical Skills Needed: {shift.criticalSkill}
                          </div>
                        </div>
                      </div>
                    </SpotlightCard>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: STUDENT MASTER SUMMARY & ACTION PLAN */}
        {activeTab === "master_summary" && (
          <motion.div
            key="master_summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cp-lime/10 text-cp-lime">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="pb-7 font-display text-lg font-bold text-cp-paper">
                    <KineticText text="Student Executive Summary & 2030 Strategy" />
                  </h3>
                  <p className="text-[12.5px] text-cp-stone">What every student must build and master today to lead tomorrow.</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <SpotlightCard className="space-y-3 rounded-3xl border border-white/10 bg-cp-ink p-5">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-cp-lime">Rule 1: Don&apos;t Just Write Code</span>
                  <h4 className="text-[15px] font-bold text-cp-paper">Master System Architecture</h4>
                  <p className="text-[13px] text-cp-stone leading-relaxed">
                    AI models generate basic code syntax instantly. Your superpower as an engineer will be system decomposition, state validation, and edge-case contracts.
                  </p>
                </SpotlightCard>

                <SpotlightCard className="space-y-3 rounded-3xl border border-white/10 bg-cp-ink p-5">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-cp-lime">Rule 2: Embrace MCP &amp; Tooling</span>
                  <h4 className="text-[15px] font-bold text-cp-paper">Connect AI to Real Systems</h4>
                  <p className="text-[13px] text-cp-stone leading-relaxed">
                    Learn to build Model Context Protocol (MCP) servers that connect AI agents to databases, git repositories, and production APIs safely.
                  </p>
                </SpotlightCard>

                <SpotlightCard className="space-y-3 rounded-3xl border border-white/10 bg-cp-ink p-5">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-cp-lime">Rule 3: Build Proven Portfolio Projects</span>
                  <h4 className="text-[15px] font-bold text-cp-paper">Ship Agentic Workflows</h4>
                  <p className="text-[13px] text-cp-stone leading-relaxed">
                    Instead of another generic weather app, build a self-healing agentic workflow or an open-model serving pipeline that recruiters can inspect.
                  </p>
                </SpotlightCard>
              </div>

              <div className="rounded-2xl border border-cp-lime/30 bg-cp-lime/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-[15px] font-bold text-cp-paper">Ready to update your target roadmap?</h4>
                  <p className="text-[13px] text-cp-stone mt-1">
                    Add recommended 2030 skills directly into your active career execution blueprint.
                  </p>
                </div>
                <MagneticButton
                  onClick={() => handleAddSkill("Model Context Protocol (MCP)")}
                  className="rounded-xl bg-cp-lime text-cp-ink px-6 py-2.5 text-[13px] font-semibold shrink-0"
                >
                  Add MCP &amp; Agent Skills to Blueprint
                </MagneticButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
