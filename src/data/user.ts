import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import heroPerson from "@/assets/hero-person.png";
import planPortrait from "@/assets/plan-portrait.png";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type Profile = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  education_level: string | null;
  degree: string | null;
  university: string | null;
  graduation_year: number | null;
  current_role: string | null;
  onboarding_completed: boolean;
  /* Phase 1 "Know Me" fields */
  current_status: string | null;
  academic_year: string | null;
  experience: string | null;
  project_count: string | null;
  learning_history: string | null;
  certifications: string | null;
  career_clarity: string | null;
  biggest_problem: string | null;
  education_prep: string | null;
  education_prep_note: string | null;
  weekly_hours: string | null;
  city: string | null;
};

export type CareerGoal = {
  id: string;
  target_role: string;
  target_industry: string | null;
};

export type CatalogSkill = { id: string; name: string; category: string };

export type Skill = { id: string; skillId: string; name: string; category: string; level: number };

export type CareerUser = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  /** Current role from the profile, falling back to the career goal. */
  role: string;
  avatar: string | null;
  /** Static editorial artwork — part of the design, not user data. */
  heroImage: string;
  planImage: string;
  profile: Profile | null;
  onboardingCompleted: boolean;
  goal: string | null;
  targetIndustry: string | null;
  /** Phase 1: no roadmap engine yet, so progress is not simulated. */
  goalProgress: number;
  education: string | null;
  skills: Skill[];
  /** User's city for location-aware features (events, notifications). */
  city: string;
  /* Phase 1: these feeds have no real data source yet, so they stay empty
     instead of showing invented numbers. Phase 2 fills them in. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scores: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roadmap: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applications: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any[];
  planDate: { day: string; month: string };
};

/* ------------------------------------------------------------------ *
 * Queries
 * ------------------------------------------------------------------ */

function planDate(date = new Date()) {
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}

function educationLine(profile: Profile | null): string | null {
  if (!profile) return null;
  const parts = [profile.degree, profile.university].filter(Boolean);
  if (profile.graduation_year) parts.push(String(profile.graduation_year));
  return parts.length ? parts.join(" • ") : (profile.education_level ?? null);
}

export async function fetchCurrentUser(): Promise<CareerUser | null> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;
  const user = auth.user;

  const [profileRes, goalRes, skillsRes, readinessRes, roadmapRes, goalsRes, appsRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("career_goals").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("user_skills")
        .select("id, skill_id, proficiency, skills(id, name, category)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("readiness_snapshots")
        .select("overall, stage, next_action, blockers, breakdown")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("roadmap_stages")
        .select("title, timeframe, completed")
        .eq("user_id", user.id)
        .order("position"),
      supabase
        .from("weekly_goals")
        .select("id, title, completed")
        .eq("user_id", user.id)
        .order("position")
        .limit(5),
      supabase
        .from("applications")
        .select("company, role_title, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  if (profileRes.error) throw profileRes.error;
  if (goalRes.error) throw goalRes.error;
  if (skillsRes.error) throw skillsRes.error;

  const readiness = readinessRes.data;
  const stages = roadmapRes.data ?? [];
  const roadmapCompleted = stages.filter((stage) => stage.completed).length;
  const roadmapProgress = stages.length ? Math.round((roadmapCompleted / stages.length) * 100) : 0;
  const breakdown =
    (readiness?.breakdown as unknown as { label?: string; score?: number }[] | null) ?? [];
  const scoreFor = (label: string) => breakdown.find((item) => item.label === label)?.score ?? 0;

  const profile = (profileRes.data as Profile | null) ?? null;
  const goal = (goalRes.data as CareerGoal | null) ?? null;

  const skills: Skill[] = (skillsRes.data ?? [])
    .map((row) => {
      const s = row.skills as unknown as CatalogSkill | null;
      if (!s) return null;
      return {
        id: row.id as string,
        skillId: s.id,
        name: s.name,
        category: s.category,
        level: (row.proficiency as number) ?? 50,
      };
    })
    .filter((s): s is Skill => s !== null);

  const firstName = profile?.first_name?.trim() ?? "";
  const lastName = profile?.last_name?.trim() ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || (user.email ?? "");
  const initials =
    [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() ||
    (user.email?.[0]?.toUpperCase() ?? "?");

  return {
    userId: user.id,
    email: user.email ?? "",
    firstName: firstName || (user.email?.split("@")[0] ?? "there"),
    lastName,
    fullName,
    initials,
    role: profile?.current_role?.trim() || goal?.target_role || "",
    avatar: profile?.avatar_url ?? null,
    heroImage: heroPerson,
    planImage: planPortrait,
    profile,
    onboardingCompleted: profile?.onboarding_completed ?? false,
    goal: goal?.target_role ?? null,
    targetIndustry: goal?.target_industry ?? null,
    goalProgress: roadmapProgress,
    education: educationLine(profile),
    city: profile?.city ?? "",
    skills,
    scores: readiness
      ? [
          {
            label: "Readiness",
            value: readiness.overall,
            max: 100,
            trend: [readiness.overall],
            note: readiness.stage ?? "Not assessed",
          },
          {
            label: "Technical Skills",
            value: scoreFor("Technical Skills"),
            max: 100,
            trend: [scoreFor("Technical Skills")],
            note: "Based on target-job evidence",
          },
          {
            label: "Project Evidence",
            value: scoreFor("Project Evidence"),
            max: 100,
            trend: [scoreFor("Project Evidence")],
            note: "GitHub and project proof",
          },
          {
            label: "Roadmap",
            value: roadmapProgress,
            max: 100,
            trend: [roadmapProgress],
            note: `${roadmapCompleted}/${stages.length} stages complete`,
          },
        ]
      : [],
    roadmap: stages.slice(0, 4).map((stage, index) => ({
      title: stage.title,
      meta: stage.timeframe ?? "No timeframe",
      progress: stage.completed
        ? 100
        : index === stages.findIndex((item) => !item.completed)
          ? 50
          : 0,
      state: stage.completed
        ? "Completed"
        : index === stages.findIndex((item) => !item.completed)
          ? "In Progress"
          : "Upcoming",
    })),
    applications: (appsRes.data ?? []).map((app) => ({
      company: app.company,
      role: app.role_title,
      status: app.status,
      initials: String(app.company ?? "?")
        .slice(0, 2)
        .toUpperCase(),
    })),
    plan: (goalsRes.data ?? []).map((goal) => ({
      id: goal.id,
      label: goal.title,
      done: goal.completed,
    })),
    planDate: planDate(),
  };
}

export const userQueryOptions = {
  queryKey: ["current-user"] as const,
  queryFn: fetchCurrentUser,
  staleTime: 30_000,
};

export function useCurrentUser() {
  return useQuery(userQueryOptions);
}

export function useSkillCatalog() {
  return useQuery({
    queryKey: ["skill-catalog"],
    queryFn: async (): Promise<CatalogSkill[]> => {
      const { data, error } = await supabase
        .from("skills")
        .select("id, name, category")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CatalogSkill[];
    },
    staleTime: 5 * 60_000,
  });
}

/* ------------------------------------------------------------------ *
 * Mutations
 * ------------------------------------------------------------------ */

export type ProfileInput = {
  first_name: string;
  last_name: string;
  education_level: string | null;
  degree: string | null;
  university: string | null;
  graduation_year: number | null;
  current_role: string | null;
  /* Phase 1 "Know Me" fields */
  current_status?: string | null;
  academic_year?: string | null;
  experience?: string | null;
  project_count?: string | null;
  learning_history?: string | null;
  certifications?: string | null;
  career_clarity?: string | null;
  biggest_problem?: string | null;
  education_prep?: string | null;
  education_prep_note?: string | null;
  weekly_hours?: string | null;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Your session has expired. Please sign in again.");
  return data.user.id;
}

export async function saveProfile(input: ProfileInput, completeOnboarding = false) {
  const userId = await requireUserId();
  const payload: Record<string, unknown> = { user_id: userId, ...input };
  if (completeOnboarding) payload["onboarding_completed"] = true;

  const { error } = await supabase
    .from("profiles")
    .upsert(payload as never, { onConflict: "user_id" });
  if (error) {
    console.error("[saveProfile] Supabase error:", error.message, error.details, error.hint);
    throw error;
  }
}

export async function saveCareerGoal(targetRole: string, targetIndustry: string | null = null) {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("career_goals")
    .upsert(
      { user_id: userId, target_role: targetRole, target_industry: targetIndustry } as never,
      { onConflict: "user_id" },
    );
  if (error) throw error;
}

export type SkillSelection = { name: string; level?: number };

/** Replaces the user's skill selection while preserving proficiency levels. */
export async function saveUserSkills(skillEntries: Array<string | SkillSelection>) {
  const userId = await requireUserId();
  const normalized = skillEntries
    .map((entry) =>
      typeof entry === "string"
        ? { name: entry.trim(), level: 50 }
        : { name: entry.name.trim(), level: Math.max(0, Math.min(100, entry.level ?? 50)) },
    )
    .filter((entry) => entry.name.length > 0);
  const names = Array.from(new Set(normalized.map((entry) => entry.name)));
  const levelByName = new Map(normalized.map((entry) => [entry.name, entry.level]));

  let skillRows: { id: string; name: string }[] = [];
  if (names.length) {
    const { error: insertError } = await supabase
      .from("skills")
      .upsert(names.map((name) => ({ name, category: "General" })) as never, {
        onConflict: "name",
        ignoreDuplicates: true,
      });
    if (insertError) throw insertError;

    const { data: rows, error: readError } = await supabase
      .from("skills")
      .select("id, name")
      .in("name", names);
    if (readError) throw readError;
    skillRows = (rows ?? []).map((r) => ({ id: r.id as string, name: r.name as string }));
  }

  const { error: deleteError } = await supabase.from("user_skills").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  if (skillRows.length) {
    const { error } = await supabase.from("user_skills").insert(
      skillRows.map(({ id: skill_id, name }) => ({
        user_id: userId,
        skill_id,
        proficiency: levelByName.get(name) ?? 50,
      })) as never,
    );
    if (error) throw error;
  }
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      profile: ProfileInput;
      goal?: string | null;
      skills?: Array<string | SkillSelection>;
    }) =>
      (async () => {
        await saveProfile(vars.profile, true);
        if (vars.goal) await saveCareerGoal(vars.goal);
        if (vars.skills) await saveUserSkills(vars.skills);
      })(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["current-user"] }),
  });
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

/** Maps backend/auth failures onto human-readable copy. */
export function friendlyError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "That email or password isn't right.";
  if (lower.includes("already registered") || lower.includes("already been registered"))
    return "An account with that email already exists. Try signing in instead.";
  if (lower.includes("password should be"))
    return "Please use a password with at least 6 characters.";
  if (lower.includes("email not confirmed")) return "Please confirm your email address first.";
  if (lower.includes("rate limit") || lower.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (
    lower.includes("session") ||
    lower.includes("unauthorized") ||
    lower.includes("sign in") ||
    lower.includes("token expired") ||
    lower.includes("jwt")
  ) {
    return "Your session has expired. Please sign in again.";
  }
  if (lower.includes("network") || lower.includes("fetch"))
    return "Connection problem. Check your internet and retry.";
  return fallback;
}

/** Returns true when the underlying error indicates an expired or missing auth session. */
export function isSessionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  return (
    lower.includes("session") ||
    lower.includes("unauthorized") ||
    lower.includes("sign in") ||
    lower.includes("token expired") ||
    lower.includes("jwt") ||
    lower.includes("auth session missing")
  );
}
