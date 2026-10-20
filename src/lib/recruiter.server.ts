import type { SupabaseClient } from "@supabase/supabase-js";

import { matchCompanyTruth, type CompanyHiringTruth } from "@/data/company-truth";
import type { Database } from "@/integrations/supabase/types";
import { clampScore, groqChat, parseJsonObject, stringList } from "./ai.server";
import { buildCareerState, careerStateToPrompt, type CareerState } from "./career-state.server";
import { formatEvidenceContext, retrieveGroundedEvidence } from "./intelligence.server";

type Client = SupabaseClient<Database>;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type BrutalVerdict = {
  category: string;
  severity: "fatal" | "critical" | "strong";
  assessment: string;
  whatToFix: string;
};

export type RecruiterAudit = {
  overallScore: number;
  hireChance: number;
  rejectChance: number;
  verdictTier: string;
  headline: string;
  brutalVerdicts: BrutalVerdict[];
  missingCritical: string[];
  whatYouNeedToBuild: {
    title: string;
    description: string;
    techStack: string[];
  };
  interviewPrediction: string;
  recruiterQuestions: string[];
  expectVsHave: { item: string; companyExpects: boolean; youHave: boolean }[];
};

export type RecruiterSession = {
  id: string;
  companyId: string;
  companyName: string;
  targetRole: string;
  overallScore: number;
  hireChance: number;
  rejectChance: number;
  verdictTier: string;
  auditResult: RecruiterAudit;
  chatMessages: { role: "recruiter" | "student"; content: string }[];
  createdAt: string;
};

/* ------------------------------------------------------------------ */
/*  AI System Prompt                                                   */
/* ------------------------------------------------------------------ */

function recruiterSystemPrompt(company: CompanyHiringTruth, role: string): string {
  return `You are the HEAD OF TALENT ACQUISITION at ${company.name} (${company.tier}).
You are conducting a BRUTAL HONEST candidate screening for the role: ${role}.

Your personality:
- Relentlessly honest — you do NOT sugarcoat.
- You evaluate candidates the way a real ${company.name} hiring panel does.
- You know exactly what ${company.name} needs and won't waste time on candidates who aren't ready.
- You speak directly, professionally, but with zero flattery.

Company context:
- Category: ${company.category}
- Primary Stack: ${company.primaryStack.join(", ")}
- Screening Filter Rate: ${company.hiringBar.screeningFilterRate}
- Non-Negotiables: ${company.hiringBar.nonNegotiables.map((n) => `${n.skill} (${n.level})`).join("; ")}
- Top Rejection Reasons: ${company.rejectionTruths.map((r) => r.title).join("; ")}

Rules:
- Never invent skills or experience the candidate doesn't have.
- If they have zero production projects, say it bluntly.
- If their skills are all claimed with no proof, call it out.
- Score honestly — most fresh graduates score 15-40.
- Output ONLY valid JSON when asked for structured data.
- In chat mode, respond as the recruiter in natural language (no JSON).`;
}

/* ------------------------------------------------------------------ */
/*  Deterministic Baseline Scoring                                     */
/* ------------------------------------------------------------------ */

function computeBaselineScore(
  state: CareerState,
  company: CompanyHiringTruth,
): { score: number; verdicts: BrutalVerdict[]; expectVsHave: RecruiterAudit["expectVsHave"] } {
  let score = 0;
  const verdicts: BrutalVerdict[] = [];
  const expectVsHave: RecruiterAudit["expectVsHave"] = [];

  // --- Resume quality (0–20 points) ---
  const ats = state.resume.atsScore ?? 0;
  const resumeScore = state.resume.resumeScore ?? 0;
  const resumeAvg = (ats + resumeScore) / 2;
  score += Math.round((resumeAvg / 100) * 20);

  if (!state.resume.hasResume) {
    verdicts.push({
      category: "CV Quality",
      severity: "fatal",
      assessment: "No resume uploaded. Without a CV, you cannot even enter the screening pipeline.",
      whatToFix: "Upload a professional, ATS-optimized resume immediately.",
    });
  } else if (resumeAvg < 40) {
    verdicts.push({
      category: "CV Quality",
      severity: "critical",
      assessment: `Your resume scores ${ats}/100 on ATS and ${resumeScore}/100 overall. This will be filtered out before any human sees it.`,
      whatToFix:
        "Rewrite your resume with quantified achievements, remove graphics/skill bars, use single-column ATS format.",
    });
  } else {
    verdicts.push({
      category: "CV Quality",
      severity: resumeAvg >= 70 ? "strong" : "critical",
      assessment: `ATS score: ${ats}/100, Overall: ${resumeScore}/100. ${resumeAvg >= 70 ? "Passes basic screening." : "Borderline — needs improvement."}`,
      whatToFix:
        resumeAvg >= 70
          ? "Minor polish — add more quantified metrics."
          : "Optimize keywords for the target role and add measurable outcomes.",
    });
  }

  // --- Projects (0–25 points) ---
  const projects = state.projects || [];
  const deployedProjects = projects.filter((p) => p.projectUrl && p.projectUrl.startsWith("http"));
  const projectScore = Math.min(25, projects.length * 5 + deployedProjects.length * 5);
  score += projectScore;

  if (projects.length === 0) {
    verdicts.push({
      category: "Project Portfolio",
      severity: "fatal",
      assessment: "Zero projects on record. Every company requires proof of what you can build.",
      whatToFix:
        "Build at least 2 production-grade projects with live deployed URLs and clean GitHub repos.",
    });
  } else if (deployedProjects.length === 0) {
    verdicts.push({
      category: "Project Portfolio",
      severity: "critical",
      assessment: `You have ${projects.length} project(s) but none are live-deployed. Localhost projects are dismissed instantly.`,
      whatToFix:
        "Deploy your best project to Vercel/Render with a public URL and document the architecture in your README.",
    });
  } else {
    verdicts.push({
      category: "Project Portfolio",
      severity: deployedProjects.length >= 2 ? "strong" : "critical",
      assessment: `${deployedProjects.length} deployed project(s) out of ${projects.length} total. ${deployedProjects.length >= 2 ? "Shows initiative." : "Need more deployed work."}`,
      whatToFix:
        deployedProjects.length >= 2
          ? "Add test coverage and CI/CD pipeline documentation."
          : "Deploy at least one more project with proper documentation.",
    });
  }

  // --- Skill coverage vs company non-negotiables (0–30 points) ---
  const studentSkillNames = new Set(state.skills.map((s) => s.name.toLowerCase()));
  const nonNegs = company.hiringBar.nonNegotiables;
  let coveredNonNeg = 0;
  const missingNonNeg: string[] = [];

  for (const nn of nonNegs) {
    const words = nn.skill
      .toLowerCase()
      .split(/[\s&,/]+/)
      .filter((w) => w.length > 2);
    const hasSkill = words.some((w) =>
      [...studentSkillNames].some((s) => s.includes(w) || w.includes(s)),
    );
    if (hasSkill) {
      coveredNonNeg++;
    } else {
      missingNonNeg.push(nn.skill);
    }
    expectVsHave.push({
      item: nn.skill,
      companyExpects: true,
      youHave: hasSkill,
    });
  }

  const skillPct = nonNegs.length > 0 ? coveredNonNeg / nonNegs.length : 0;
  score += Math.round(skillPct * 30);

  verdicts.push({
    category: "Technical Skills",
    severity: skillPct >= 0.7 ? "strong" : skillPct >= 0.4 ? "critical" : "fatal",
    assessment: `You cover ${coveredNonNeg}/${nonNegs.length} of ${company.name}'s non-negotiable skills. ${missingNonNeg.length > 0 ? `Missing: ${missingNonNeg.join(", ")}.` : "All covered."}`,
    whatToFix:
      missingNonNeg.length > 0
        ? `Learn and build proof for: ${missingNonNeg.slice(0, 3).join(", ")}.`
        : "Strengthen evidence for your existing skills with project proof.",
  });

  // --- Evidence strength (0–15 points) ---
  const evidencedSkills = state.skills.filter((s) => s.evidenceStrength > 0);
  const evidencePct = state.skills.length > 0 ? evidencedSkills.length / state.skills.length : 0;
  score += Math.round(evidencePct * 15);

  verdicts.push({
    category: "Interview Readiness",
    severity: evidencePct >= 0.6 ? "strong" : evidencePct >= 0.3 ? "critical" : "fatal",
    assessment: `${evidencedSkills.length}/${state.skills.length} skills have verified evidence beyond self-claims. ${evidencePct < 0.3 ? "Most skills are unverified claims — interviewers will probe these." : ""}`,
    whatToFix:
      evidencePct < 0.5
        ? "Prove your skills through project commits, certifications, or competition results."
        : "Continue building evidence for remaining claimed skills.",
  });

  // --- Profile completeness (0–10 points) ---
  const hasGoal = Boolean(state.targetRole);
  const hasProfile = Boolean(state.profile.firstName);
  const profileScore = (hasGoal ? 5 : 0) + (hasProfile ? 5 : 0);
  score += profileScore;

  verdicts.push({
    category: "Market Positioning",
    severity: hasGoal && hasProfile ? "strong" : "critical",
    assessment: `${!hasGoal ? "No target role defined — you're applying without direction. " : ""}${!hasProfile ? "Incomplete profile." : "Profile is set up."}`,
    whatToFix: !hasGoal
      ? "Define a specific target role and company."
      : "Keep your profile updated and aligned with your target.",
  });

  return { score: clampScore(score), verdicts, expectVsHave };
}

function scoreToTier(score: number): string {
  if (score <= 25) return "Immediate Reject";
  if (score <= 45) return "Weak Candidate";
  if (score <= 65) return "Needs Significant Work";
  if (score <= 80) return "Competitive with Gaps";
  return "Strong Hire Potential";
}

/* ------------------------------------------------------------------ */
/*  Run Recruiter Audit                                                */
/* ------------------------------------------------------------------ */

export async function runRecruiterAudit(
  supabase: Client,
  userId: string,
  options: { company?: string; role?: string } = {},
): Promise<RecruiterSession> {
  console.info("[CareerPilot][recruiter-audit] start", { userId, options });

  const state = await buildCareerState(supabase, userId);
  const targetRole = options.role?.trim() || state.targetRole || "Associate Software Engineer";
  const targetCompany = options.company?.trim() || state.targetJob?.company || "Systems Limited";
  const companyTruth = matchCompanyTruth(targetCompany);

  // Deterministic baseline
  const baseline = computeBaselineScore(state, companyTruth);

  // AI-enhanced analysis
  let aiResult: Partial<RecruiterAudit> = {};
  try {
    const groundedEvidence = formatEvidenceContext(
      await retrieveGroundedEvidence(
        supabase,
        userId,
        `${targetCompany} ${targetRole} hiring requirements, rejection reasons, and trusted proof`,
        targetRole,
      ),
    );
    const prompt = `=== CANDIDATE PROFILE ===
${careerStateToPrompt(state)}

=== TARGET ===
Role: ${targetRole}
Company: ${companyTruth.name} (${companyTruth.tier})
Non-Negotiables: ${companyTruth.hiringBar.nonNegotiables.map((n) => n.skill).join(", ")}
Rejection Reasons: ${companyTruth.rejectionTruths.map((t) => t.title).join("; ")}

=== BASELINE SCORE ===
Deterministic Score: ${baseline.score}/100

=== GROUNDED EVIDENCE ===
${groundedEvidence}

Evaluate this candidate as ${companyTruth.name}'s Head of Talent. Return JSON:
{
  "overall_score": number (0-100, be brutally honest, most fresh graduates score 15-40),
  "hire_chance": number (0-100),
  "reject_chance": number (0-100),
  "headline": string (one brutal sentence summary, max 120 chars),
  "brutal_verdicts": [
    { "category": string, "severity": "fatal"|"critical"|"strong", "assessment": string, "what_to_fix": string }
  ] (exactly 6 verdicts for: CV Quality, Technical Skills, Project Portfolio, Interview Readiness, Market Positioning, Culture Fit),
  "missing_critical": string[] (3-5 critical things ${companyTruth.name} requires that this candidate lacks),
  "what_you_need_to_build": { "title": string, "description": string, "tech_stack": string[] },
  "interview_prediction": string (how would this candidate perform in a real ${companyTruth.name} interview today, 2-3 sentences),
  "recruiter_questions": string[] (4 probing questions you would ask in a real screen)
}`;

    const raw = await groqChat(
      [
        { role: "system", content: recruiterSystemPrompt(companyTruth, targetRole) },
        { role: "user", content: prompt },
      ],
      { json: true, maxTokens: 2000, temperature: 0.35 },
    );

    const parsed = parseJsonObject<Record<string, unknown>>(raw);

    const aiScore = clampScore(parsed["overall_score"], baseline.score);
    const finalScore = Math.round((aiScore + baseline.score) / 2);

    aiResult = {
      overallScore: finalScore,
      hireChance: clampScore(parsed["hire_chance"], Math.max(0, finalScore - 15)),
      rejectChance: clampScore(parsed["reject_chance"], Math.min(100, 100 - finalScore + 15)),
      headline:
        String(parsed["headline"] ?? "")
          .trim()
          .slice(0, 200) || `Score: ${finalScore}/100`,
      brutalVerdicts: Array.isArray(parsed["brutal_verdicts"])
        ? (parsed["brutal_verdicts"] as Record<string, unknown>[]).map((v) => ({
            category: String(v["category"] ?? "").trim(),
            severity: (["fatal", "critical", "strong"].includes(String(v["severity"]))
              ? String(v["severity"])
              : "critical") as BrutalVerdict["severity"],
            assessment: String(v["assessment"] ?? "").trim(),
            whatToFix: String(v["what_to_fix"] ?? "").trim(),
          }))
        : baseline.verdicts,
      missingCritical: stringList(parsed["missing_critical"], 6),
      whatYouNeedToBuild: (() => {
        const w = parsed["what_you_need_to_build"];
        if (w && typeof w === "object") {
          const wObj = w as Record<string, unknown>;
          return {
            title: String(wObj["title"] ?? "Production-Grade Project").trim(),
            description: String(wObj["description"] ?? "").trim(),
            techStack: stringList(wObj["tech_stack"], 6),
          };
        }
        return {
          title: `Production-Grade ${companyTruth.primaryStack[0] || "Full Stack"} Application`,
          description: `Build a real application that demonstrates mastery of ${companyTruth.name}'s core stack.`,
          techStack: companyTruth.primaryStack.slice(0, 4),
        };
      })(),
      interviewPrediction:
        String(parsed["interview_prediction"] ?? "").trim() ||
        "Unable to assess — insufficient data for interview prediction.",
      recruiterQuestions: stringList(parsed["recruiter_questions"], 5),
    };
  } catch (err) {
    console.warn("[CareerPilot][recruiter-audit] AI failed, using deterministic baseline", err);
  }

  // Merge AI with baseline (baseline as fallback)
  const audit: RecruiterAudit = {
    overallScore: aiResult.overallScore ?? baseline.score,
    hireChance: aiResult.hireChance ?? Math.max(0, baseline.score - 15),
    rejectChance: aiResult.rejectChance ?? Math.min(100, 100 - baseline.score + 15),
    verdictTier: scoreToTier(aiResult.overallScore ?? baseline.score),
    headline: aiResult.headline ?? `Baseline Score: ${baseline.score}/100`,
    brutalVerdicts:
      aiResult.brutalVerdicts && aiResult.brutalVerdicts.length >= 4
        ? aiResult.brutalVerdicts
        : baseline.verdicts,
    missingCritical: aiResult.missingCritical?.length
      ? aiResult.missingCritical
      : companyTruth.hiringBar.nonNegotiables
          .filter((_, i) => !baseline.expectVsHave[i]?.youHave)
          .map((n) => n.skill)
          .slice(0, 5),
    whatYouNeedToBuild: aiResult.whatYouNeedToBuild ?? {
      title: `Production-Grade ${companyTruth.primaryStack[0] || "Full Stack"} Application`,
      description: `Build a deployed project using ${companyTruth.name}'s core stack.`,
      techStack: companyTruth.primaryStack.slice(0, 4),
    },
    interviewPrediction: aiResult.interviewPrediction ?? "Assessment requires more data.",
    recruiterQuestions: aiResult.recruiterQuestions?.length
      ? aiResult.recruiterQuestions
      : [
          `Walk me through your most complex project. What was the hardest technical decision?`,
          `How would you design a scalable API for ${companyTruth.primaryStack[0] || "our stack"}?`,
          `Tell me about a time you debugged a production issue under pressure.`,
          `Why ${companyTruth.name}? What do you know about our engineering culture?`,
        ],
    expectVsHave: baseline.expectVsHave,
  };

  // Save to database
  const { data: session, error } = await supabase
    .from("recruiter_sessions")
    .insert({
      user_id: userId,
      company_id: companyTruth.id,
      company_name: companyTruth.name,
      target_role: targetRole,
      overall_score: audit.overallScore,
      hire_chance: audit.hireChance,
      reject_chance: audit.rejectChance,
      verdict_tier: audit.verdictTier,
      audit_result: JSON.parse(JSON.stringify(audit)),
      chat_messages: JSON.parse("[]"),
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[CareerPilot][recruiter-audit] DB save failed", error);
    throw new Error("Failed to save recruiter audit session.");
  }

  console.info("[CareerPilot][recruiter-audit] complete", {
    userId,
    sessionId: session.id,
    score: audit.overallScore,
  });

  return {
    id: session.id,
    companyId: companyTruth.id,
    companyName: companyTruth.name,
    targetRole,
    overallScore: audit.overallScore,
    hireChance: audit.hireChance,
    rejectChance: audit.rejectChance,
    verdictTier: audit.verdictTier,
    auditResult: audit,
    chatMessages: [],
    createdAt: session.created_at,
  };
}

/* ------------------------------------------------------------------ */
/*  Chat With Recruiter                                                */
/* ------------------------------------------------------------------ */

export async function chatWithRecruiter(
  supabase: Client,
  userId: string,
  sessionId: string,
  userMessage: string,
): Promise<{ reply: string; messages: RecruiterSession["chatMessages"] }> {
  console.info("[CareerPilot][recruiter-chat] start", { userId, sessionId });

  // Load session
  const { data: session, error } = await supabase
    .from("recruiter_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error || !session) throw new Error("Recruiter session not found.");

  const companyTruth = matchCompanyTruth(session.company_name);
  const audit = session.audit_result as unknown as RecruiterAudit;
  const existingMessages = (session.chat_messages ?? []) as RecruiterSession["chatMessages"];

  // Build conversation history for AI
  const chatHistory = existingMessages.map((m) => ({
    role: (m.role === "recruiter" ? "assistant" : "user") as "assistant" | "user",
    content: m.content,
  }));

  const contextPrompt = `You previously audited this candidate and gave them ${audit.overallScore}/100.
Verdict: ${audit.verdictTier}. Headline: ${audit.headline}.
Missing critical skills: ${audit.missingCritical.join(", ")}.
Stay in character as ${companyTruth.name}'s Head of Talent. Answer the student's question honestly and helpfully.
Keep responses concise (2-4 paragraphs max). Be direct, specific, and actionable.`;

  const aiMessages = [
    { role: "system" as const, content: recruiterSystemPrompt(companyTruth, session.target_role) },
    { role: "user" as const, content: contextPrompt },
    ...chatHistory,
    { role: "user" as const, content: userMessage },
  ];

  let reply: string;
  try {
    reply = await groqChat(aiMessages, { maxTokens: 800, temperature: 0.5 });
  } catch {
    reply = "I'm having trouble connecting right now. Please try again in a moment.";
  }

  // Append new messages
  const newMessages: RecruiterSession["chatMessages"] = [
    ...existingMessages,
    { role: "student", content: userMessage },
    { role: "recruiter", content: reply },
  ];

  // Update session
  await supabase
    .from("recruiter_sessions")
    .update({
      chat_messages: JSON.parse(JSON.stringify(newMessages)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  console.info("[CareerPilot][recruiter-chat] replied", { sessionId, replyLength: reply.length });

  return { reply, messages: newMessages };
}

/* ------------------------------------------------------------------ */
/*  Load Latest Session                                                */
/* ------------------------------------------------------------------ */

export async function loadRecruiterSession(
  supabase: Client,
  userId: string,
): Promise<RecruiterSession | null> {
  const { data, error } = await supabase
    .from("recruiter_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    companyId: data.company_id,
    companyName: data.company_name,
    targetRole: data.target_role,
    overallScore: data.overall_score,
    hireChance: data.hire_chance,
    rejectChance: data.reject_chance,
    verdictTier: data.verdict_tier,
    auditResult: data.audit_result as unknown as RecruiterAudit,
    chatMessages: (data.chat_messages ?? []) as unknown as RecruiterSession["chatMessages"],
    createdAt: data.created_at,
  };
}
