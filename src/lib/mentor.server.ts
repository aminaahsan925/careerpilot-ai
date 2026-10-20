import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { groqChat, type ChatMsg } from "./ai.server";
import { formatEvidenceContext, retrieveCareerEvidence } from "./intelligence.server";

type Client = SupabaseClient<Database>;

export const MENTOR_HISTORY_LIMIT = 20;

/** Builds a compact, factual snapshot of the user's career data for the model. */
export async function buildCareerContext(supabase: Client, userId: string): Promise<string> {
  const [profileRes, goalRes, skillsRes, analysisRes, stagesRes, appsRes, projectsRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("career_goals").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("user_skills")
        .select("proficiency, skills(name, category)")
        .eq("user_id", userId),
      supabase
        .from("resume_analyses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("roadmap_stages")
        .select("title, timeframe, completed, skills")
        .eq("user_id", userId)
        .order("position"),
      supabase.from("applications").select("company, role_title, status").eq("user_id", userId),
      supabase
        .from("user_projects")
        .select("name, description, technologies, project_url, project_type")
        .eq("user_id", userId)
        .order("position"),
    ]);

  const profile = profileRes.data;
  const goal = goalRes.data;
  const skills = (skillsRes.data ?? [])
    .map((r) => {
      const s = r.skills as unknown as { name?: string } | null;
      return s?.name ? `${s.name} (${r.proficiency}%)` : null;
    })
    .filter(Boolean);
  const analysis = analysisRes.data;
  const stages = stagesRes.data ?? [];
  const apps = appsRes.data ?? [];

  const lines: string[] = [];
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  if (name) lines.push(`Name: ${name}`);
  if (profile?.current_role) lines.push(`Current role: ${profile.current_role}`);
  const education = [profile?.degree, profile?.university, profile?.graduation_year]
    .filter(Boolean)
    .join(", ");
  if (education) lines.push(`Education: ${education}`);
  if (goal?.target_role) lines.push(`Target role: ${goal.target_role}`);
  if (goal?.target_industry) lines.push(`Target industry: ${goal.target_industry}`);
  lines.push(skills.length ? `Skills: ${skills.join(", ")}` : "Skills: none recorded yet");

  if (analysis) {
    lines.push(
      `Latest resume analysis — ATS ${analysis.ats_score}/100, resume ${analysis.resume_score}/100, career match ${analysis.career_match}/100.`,
    );
    const weaknesses = Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [];
    if (weaknesses.length) lines.push(`Resume gaps: ${weaknesses.slice(0, 5).join("; ")}`);
  } else {
    lines.push("No resume has been analysed yet.");
  }

  if (stages.length) {
    const done = stages.filter((s) => s.completed).length;
    lines.push(
      `Roadmap (${done}/${stages.length} stages complete): ${stages
        .map((s) => `${s.title}${s.completed ? " ✓" : ""}`)
        .join(" → ")}`,
    );
  } else {
    lines.push("No roadmap generated yet.");
  }

  if (apps.length) {
    lines.push(
      `Applications: ${apps
        .map((a) => `${a.role_title} @ ${a.company} (${a.status})`)
        .slice(0, 8)
        .join("; ")}`,
    );
  }

  const projects = projectsRes.data ?? [];
  if (projects.length) {
    lines.push(
      `Projects (${projects.length}): ${projects
        .map((p) => {
          const techs = Array.isArray(p.technologies)
            ? (p.technologies as string[]).slice(0, 5).join(", ")
            : "";
          return `${p.name as string}${techs ? ` [${techs}]` : ""}${p.project_url ? ` (${p.project_url})` : ""}`;
        })
        .join("; ")}`,
    );
  } else {
    lines.push("No projects recorded yet.");
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are CareerPilot's AI career mentor: a sharp, brutally honest career coach for students and early-career professionals. You do not sugar-coat. You do not comfort. You tell students what they need to hear, not what they want to hear.

CORE PRINCIPLE: Honesty builds trust. Sugar-coating breeds complacency. Your job is to wake students up.

Rules:
- Ground every answer in the user's actual profile data. Never invent scores, employers, or achievements not listed.
- If a fact isn't in the profile, name what's missing directly: "Your profile has no resume" — NOT "You might consider uploading a resume."
- Use direct language: "You are missing X" / "Your profile shows zero evidence of X" / "This is not enough because…"
- NEVER say "You might want to…" or "It could help to…" or "Consider…" — say "Do X" / "You need X" / "Build X."
- Challenge unrealistic expectations. If a student expects a senior role with junior skills, say so: "You are not ready for that role yet. Here's why…"
- If their skills don't match market demand, state it explicitly: "The market wants X. You have Y. That gap is why you're not getting interviews."
- Be concrete and actionable: name specific skills, projects, resources, and deadlines.
- Keep replies under 180 words, plain text, no markdown headings. Short paragraphs or dashes only.
- Direct, urgent, and practical — never generic filler, never soft encouragement.`;

export async function runMentorTurn(
  supabase: Client,
  userId: string,
  message: string,
): Promise<{ reply: string }> {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("Please type a message first.");
  if (trimmed.length > 2000)
    throw new Error("That message is too long — keep it under 2000 characters.");

  const [context, historyRes] = await Promise.all([
    buildCareerContext(supabase, userId),
    supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MENTOR_HISTORY_LIMIT),
  ]);
  if (historyRes.error) {
    // Conversation history is useful but should not prevent a fresh mentor
    // answer when the optional chat table has not reached production yet.
    console.warn("[CareerPilot][mentor] chat history unavailable:", historyRes.error.message);
  }

  const history = (historyRes.data ?? []).slice().reverse();
  const targetRole = context.match(/Target role: ([^\n]+)/)?.[1] ?? null;
  const retrievedEvidence = formatEvidenceContext(retrieveCareerEvidence(trimmed, targetRole));

  const messages: ChatMsg[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\n<user_profile>\n${context}\n</user_profile>\n\n<grounded_evidence>\n${retrievedEvidence}\n</grounded_evidence>\n\nUse the evidence labels when making factual claims. If the profile conflicts with role evidence, state the conflict plainly.`,
    },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: `<user_message>\n${trimmed}\n</user_message>` },
  ];

  let reply: string;
  try {
    reply = await groqChat(messages, { maxTokens: 700, temperature: 0.65 });
  } catch (err) {
    // AI service unavailable — provide a deterministic fallback so mentor
    // remains usable during local development.

    console.error("groqChat error in runMentorTurn:", err);
    const ctxSnippet = context.split("\n").slice(0, 6).join(" — ");
    reply = `AI temporarily unavailable. Based on your profile: ${ctxSnippet}. Immediate next step: set a clear target role and add one project demonstrating a key skill.`;
  }

  const { error } = await supabase.from("chat_messages").insert([
    { user_id: userId, role: "user", content: trimmed },
    { user_id: userId, role: "assistant", content: reply },
  ]);
  if (error) {
    // Do not discard a useful answer because history persistence is not ready.
    console.warn("[CareerPilot][mentor] could not save chat history:", error.message);
  }

  return { reply };
}
