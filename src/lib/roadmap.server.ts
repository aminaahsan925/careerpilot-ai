import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { groqChat, parseJsonObject, stringList } from "./ai.server";
import { consumeAiCall } from "./billing.server";
import { buildCareerContext } from "./mentor.server";

type Client = SupabaseClient<Database>;

const SYSTEM = `You are a senior career coach who designs practical learning roadmaps.
Return ONLY a JSON object:
{
  "stages": [{
    "title": string,
    "timeframe": string (e.g. "Weeks 1-3"),
    "description": string (max 140 chars),
    "skills": string[] (2-4 concrete skills),
    "project": string (one buildable portfolio project),
    "courses": [{"name": string, "provider": string, "weeks": string}] (0-2)
  }] (4-6 stages, ordered from foundations to job-ready),
  "milestones": string[] (4-6 short checkpoints ending with landing the target role)
}
Tailor everything to the stated target role and skip what the candidate already knows well.`;

export async function generateRoadmapFor(supabase: Client, userId: string) {
  const { data: goal } = await supabase
    .from("career_goals")
    .select("target_role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!goal?.target_role) {
    throw new Error("Set a career goal first so the roadmap can be tailored to it.");
  }

  // Quota first: one AI call is consumed before the provider is called.
  await consumeAiCall(supabase, userId, "roadmap");
  const context = await buildCareerContext(supabase, userId);

  const raw = await groqChat(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Build a roadmap toward: ${goal.target_role}.\n\n=== CANDIDATE PROFILE ===\n${context}`,
      },
    ],
    { json: true, maxTokens: 2000, temperature: 0.5 },
  );

  const parsed = parseJsonObject<Record<string, unknown>>(raw);
  const rawStages = Array.isArray(parsed["stages"])
    ? (parsed["stages"] as Record<string, unknown>[])
    : [];
  if (!rawStages.length) throw new Error("The roadmap couldn't be generated. Please try again.");

  const stages = rawStages.slice(0, 6).map((s, i) => ({
    user_id: userId,
    title: String(s["title"] ?? `Stage ${i + 1}`).slice(0, 120),
    timeframe: String(s["timeframe"] ?? "").slice(0, 60) || null,
    description: String(s["description"] ?? "").slice(0, 240) || null,
    skills: stringList(s["skills"], 5),
    project: String(s["project"] ?? "").slice(0, 200) || null,
    courses: Array.isArray(s["courses"])
      ? (s["courses"] as Record<string, unknown>[])
          .map((c) => ({
            name: String(c?.["name"] ?? "").slice(0, 120),
            provider: String(c?.["provider"] ?? "").slice(0, 80),
            weeks: String(c?.["weeks"] ?? "").slice(0, 40),
          }))
          .filter((c) => c.name)
          .slice(0, 2)
      : [],
    position: i,
    completed: false,
  }));

  const milestones = stringList(parsed["milestones"], 6).map((label, i) => ({
    user_id: userId,
    label: label.slice(0, 160),
    position: i,
    completed: false,
  }));

  await supabase.from("roadmap_stages").delete().eq("user_id", userId);
  await supabase.from("roadmap_milestones").delete().eq("user_id", userId);

  const { error: stageError } = await supabase.from("roadmap_stages").insert(stages);
  if (stageError) throw stageError;

  if (milestones.length) {
    const { error: msError } = await supabase.from("roadmap_milestones").insert(milestones);
    if (msError) throw msError;
  }

  return { stages: stages.length, milestones: milestones.length };
}
