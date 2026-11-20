/**
 * Onboarding (Know Me flow), Round 3 (Cursor as Flashlight / Lens).
 *
 * Signature moments, presentation only: a kinetic step reveal (the step
 * title's words rise in on every step change), a light disc over the
 * big step counter, spotlight borders on the step card, and a magnetic
 * Continue button. The form logic, validation, progressive save and
 * final save are unchanged; motion never blocks input or navigation.
 */
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2, X } from "lucide-react";

import {
  friendlyError,
  isSessionError,
  saveProfile,
  useCurrentUser,
  useSaveProfile,
  useSkillCatalog,
  type Profile,
} from "@/data/user";
import { useProjects, useSaveProjects } from "@/data/projects";
import { supabase } from "@/integrations/supabase/client";
import { UniversitySearch } from "@/components/app/UniversitySearch";
import { MagneticButton } from "@/components/lens/MagneticButton";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import "@/components/onboarding/onboarding.css";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Know Me - CareerPilot AI" },
      {
        name: "description",
        content:
          "Tell CareerPilot about yourself so it can understand where you are starting from.",
      },
    ],
  }),
  component: OnboardingPage,
});

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const EDUCATION_LEVELS = ["High School", "Diploma", "Bachelor's", "Master's", "PhD", "Self-taught"];

const CURRENT_STATUS_OPTIONS = [
  "University Student",
  "Final-Year Student",
  "Recent Graduate",
  "Looking for my first job",
  "Looking for an internship",
  "Already working",
  "Changing career",
];

const ACADEMIC_YEAR_OPTIONS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "Graduated",
];

const EXPERIENCE_OPTIONS = [
  "No projects yet",
  "University/academic projects",
  "Personal projects",
  "Freelance projects",
  "Internship",
  "Part-time work",
  "Professional job",
  "Open-source contribution",
];

const PROJECT_COUNT_OPTIONS = ["1", "2-3", "4-5", "6+"];

const LEARNING_HISTORY_OPTIONS = [
  "University courses",
  "YouTube",
  "Online courses",
  "Bootcamp",
  "Documentation",
  "Projects",
  "Internships",
  "Self-learning",
  "Certifications",
];

const CAREER_CLARITY_OPTIONS = [
  "I know exactly what role I want",
  "I have a general idea",
  "I am confused",
  "I have no idea yet",
];

const BIGGEST_PROBLEM_OPTIONS = [
  "I don't know what to learn",
  "I don't know which career to choose",
  "I have skills but can't get interviews",
  "I have projects but no job",
  "I don't know what companies expect",
  "My university doesn't prepare me for industry",
  "I don't know how to improve my CV",
  "I don't know which technologies matter",
  "I don't know where to start",
];

const EDUCATION_PREP_OPTIONS = ["Very well", "Somewhat", "Not much", "I don't know yet"];

const WEEKLY_TIME_OPTIONS = [
  "Less than 3 hours",
  "3-5 hours",
  "5-10 hours",
  "10-15 hours",
  "15+ hours",
];

const CONFIDENCE_LEVELS = ["Beginner", "Comfortable", "Strong"] as const;

const PROJECT_TYPE_OPTIONS = [
  { value: "personal", label: "Personal project" },
  { value: "academic", label: "University / academic" },
  { value: "freelance", label: "Freelance / client" },
  { value: "open-source", label: "Open-source" },
  { value: "hackathon", label: "Hackathon" },
];

type ProjectDraft = {
  name: string;
  description: string;
  technologies: string[];
  projectUrl: string;
  projectType: string;
};

const STEPS = [
  { label: "About You", hint: "The basics we'll use across your workspace." },
  { label: "Education", hint: "Where you're studying and what stage you're at." },
  { label: "Experience", hint: "What you've worked on so far." },
  { label: "Your Projects", hint: "Show what you've built. This counts as real evidence." },
  { label: "Skills", hint: "What you can do today, your perception, not a test." },
  { label: "Career Direction", hint: "Where you're headed and how you're learning." },
  { label: "Your Situation", hint: "Your time, your concerns, your starting point." },
  { label: "Target", hint: "The role you're working towards." },
  { label: "Final Setup", hint: "Your starting profile is ready." },
];

const OTHER_LABEL = "Other, I'll write my own";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function tryParseJSON(v: string | null): string[] | null {
  if (!v) return null;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Combine selected values with optional "Other" custom text. */
function combineWithOther(values: string[], otherText: string): string[] {
  const result = [...values];
  const trimmed = otherText.trim();
  if (trimmed) result.push(`Other: ${trimmed}`);
  return result;
}

/** Initialise multi-select state from a stored JSON string. */
function parseMultiSelect(v: string | null): { values: string[]; other: string } {
  const arr = tryParseJSON(v) ?? [];
  const otherItems = arr.filter((item) => item.startsWith("Other: "));
  const normalItems = arr.filter((item) => !item.startsWith("Other: "));
  const otherText = otherItems.length > 0 ? otherItems[0]!.replace("Other: ", "") : "";
  return { values: normalItems, other: otherText };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function OnboardingPage() {
  const navigate = useNavigate();
  const save = useSaveProfile();
  const { data: catalog = [] } = useSkillCatalog();
  const { data: existingUser, isLoading: userLoading } = useCurrentUser();
  const { data: existingProjects } = useProjects();
  const saveProjects = useSaveProjects();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Step 0 — About You
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");
  const [statusOther, setStatusOther] = useState("");

  // Step 1 — Education
  const [educationLevel, setEducationLevel] = useState("");
  const [degree, setDegree] = useState("");
  const [university, setUniversity] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  // Step 2 — Experience
  const [experience, setExperience] = useState<string[]>([]);
  const [experienceOther, setExperienceOther] = useState("");
  const [projectCount, setProjectCount] = useState("");

  // Step 3 — Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [confidence, setConfidence] = useState<Record<string, string>>({});

  // Step 4 — Career Direction
  const [learningHistory, setLearningHistory] = useState<string[]>([]);
  const [learningOther, setLearningOther] = useState("");
  const [careerClarity, setCareerClarity] = useState("");
  const [certifications, setCertifications] = useState<"yes" | "no" | "">("");

  // Step 5 — Your Situation
  const [biggestProblem, setBiggestProblem] = useState("");
  const [problemOther, setProblemOther] = useState("");
  const [educationPrep, setEducationPrep] = useState("");
  const [educationPrepNote, setEducationPrepNote] = useState("");
  const [weeklyTime, setWeeklyTime] = useState("");

  // Step 6 — Target
  const [targetRole, setTargetRole] = useState("");

  // Step 3 — Your Projects (draft state, saved separately)
  const [projects, setProjects] = useState<ProjectDraft[]>([]);
  const [techInput, setTechInput] = useState<Record<number, string>>({});

  /* ---- Load existing profile data ---- */
  useEffect(() => {
    if (!existingUser?.profile || loaded) return;
    const p = existingUser.profile;
    setFirstName(p.first_name ?? "");
    setLastName(p.last_name ?? "");
    setEducationLevel(p.education_level ?? "");
    setDegree(p.degree ?? "");
    setUniversity(p.university ?? "");
    setGraduationYear(p.graduation_year ? String(p.graduation_year) : "");
    setAcademicYear(p.academic_year ?? "");
    setProjectCount(p.project_count ?? "");
    setCareerClarity(p.career_clarity ?? "");
    setEducationPrep(p.education_prep ?? "");
    setEducationPrepNote(p.education_prep_note ?? "");
    setWeeklyTime(p.weekly_hours ?? "");
    setCertifications((p.certifications as "yes" | "no" | "") ?? "");
    if (p.current_status) {
      if (p.current_status.startsWith("Other: ")) {
        setCurrentStatus(OTHER_LABEL);
        setStatusOther(p.current_status.replace("Other: ", ""));
      } else {
        setCurrentStatus(p.current_status);
      }
    } else if (p.current_role) {
      // Legacy user: prefill current_status from existing current_role
      setCurrentStatus(OTHER_LABEL);
      setStatusOther(p.current_role);
    }
    const exp = parseMultiSelect(p.experience);
    setExperience(exp.values);
    setExperienceOther(exp.other);
    const lh = parseMultiSelect(p.learning_history);
    setLearningHistory(lh.values);
    setLearningOther(lh.other);
    if (p.biggest_problem) {
      if (p.biggest_problem.startsWith("Other: ")) {
        setBiggestProblem(OTHER_LABEL);
        setProblemOther(p.biggest_problem.replace("Other: ", ""));
      } else {
        setBiggestProblem(p.biggest_problem);
      }
    }
    // Load existing target role from career_goals (for returning users)
    if (existingUser.goal) setTargetRole(existingUser.goal);
    setLoaded(true);
  }, [existingUser, loaded]);

  /* ---- Load existing projects ---- */
  useEffect(() => {
    if (!existingProjects || projects.length > 0) return;
    if (existingProjects.length > 0) {
      setProjects(
        existingProjects.map((p) => ({
          name: p.name,
          description: p.description ?? "",
          technologies: p.technologies ?? [],
          projectUrl: p.projectUrl ?? "",
          projectType: p.projectType ?? "personal",
        })),
      );
    }
  }, [existingProjects, projects.length]);

  /* ---- Build ProfileInput from current state ---- */
  const buildInput = useCallback(
    () => ({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      education_level: educationLevel || null,
      degree: degree.trim() || null,
      university: university.trim() || null,
      graduation_year: Number.isFinite(Number.parseInt(graduationYear, 10))
        ? Number.parseInt(graduationYear, 10)
        : null,
      current_role:
        currentStatus === OTHER_LABEL ? statusOther.trim() || null : currentStatus || null,
      current_status:
        currentStatus === OTHER_LABEL
          ? statusOther.trim()
            ? `Other: ${statusOther.trim()}`
            : null
          : currentStatus || null,
      academic_year: academicYear || null,
      experience: JSON.stringify(combineWithOther(experience, experienceOther)),
      project_count: projectCount || null,
      learning_history: JSON.stringify(combineWithOther(learningHistory, learningOther)),
      certifications: certifications || null,
      career_clarity: careerClarity || null,
      biggest_problem:
        biggestProblem === OTHER_LABEL
          ? problemOther.trim()
            ? `Other: ${problemOther.trim()}`
            : null
          : biggestProblem || null,
      education_prep: educationPrep || null,
      education_prep_note: educationPrepNote.trim() || null,
      weekly_hours: weeklyTime || null,
    }),
    [
      firstName,
      lastName,
      educationLevel,
      degree,
      university,
      graduationYear,
      currentStatus,
      statusOther,
      academicYear,
      experience,
      experienceOther,
      projectCount,
      learningHistory,
      learningOther,
      certifications,
      careerClarity,
      biggestProblem,
      problemOther,
      educationPrep,
      educationPrepNote,
      weeklyTime,
    ],
  );

  /* ---- Progressive save (does NOT mark onboarding complete) ---- */
  const saveCurrent = useCallback(async () => {
    if (!firstName.trim()) return;
    await saveProfile(buildInput(), false);
  }, [buildInput, firstName]);

  /* ---- Navigation ---- */
  const goNext = async () => {
    setError(null);
    try {
      await saveCurrent();
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    } catch (err) {
      setError(friendlyError(err, "Could not save. Please try again."));
    }
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  /* ---- Final save (marks onboarding complete) ---- */
  const finish = async () => {
    setError(null);
    try {
      // Ensure the access token is fresh before the final multi-table save.
      // Without this, a stale JWT can cause the upsert to be rejected by RLS
      // (Supabase falls back to the anon role, which has no table grants).
      const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !sessionData.session) {
        await navigate({ to: "/auth", search: { redirect: "/onboarding", reset: undefined } });
        return;
      }

      await save.mutateAsync({
        profile: buildInput(),
        goal: targetRole.trim() || null,
        skills,
      });
      // Save projects (optional — skip if none added)
      if (projects.some((p) => p.name.trim())) {
        await saveProjects.mutateAsync(
          projects
            .filter((p) => p.name.trim())
            .map((p) => {
              const proj: import("@/lib/project.server").ProjectInput = {
                name: p.name.trim(),
                technologies: p.technologies.filter(Boolean),
                projectType: ([
                  "personal",
                  "academic",
                  "freelance",
                  "open-source",
                  "hackathon",
                ].includes(p.projectType)
                  ? p.projectType
                  : "personal") as
                  "personal" | "academic" | "freelance" | "open-source" | "hackathon",
                completed: true,
              };
              const desc = p.description.trim();
              if (desc) proj.description = desc;
              const url = p.projectUrl.trim();
              if (url) proj.projectUrl = url;
              return proj;
            }),
        );
      }
      await navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      if (isSessionError(err)) {
        await navigate({ to: "/auth", search: { redirect: "/onboarding", reset: undefined } });
        return;
      }
      setError(friendlyError(err, "Your profile could not be saved. Please try again."));
    }
  };

  /* ---- Validation ---- */
  const isLegacyUser =
    existingUser?.profile?.onboarding_completed === true && !existingUser?.profile?.current_status;
  const isReturningUser =
    existingUser?.profile?.onboarding_completed === true && existingUser?.profile?.current_status != null;

  const canContinue =
    step === 0
      ? firstName.trim().length > 0 && currentStatus.trim().length > 0
      : step === 7
        ? targetRole.trim().length > 0
        : true;

  /* ---- Skill helpers ---- */
  function toggleSkill(name: string) {
    setSkills((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));
  }
  function addCustomSkill() {
    const name = customSkill.trim();
    if (!name) return;
    setSkills((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setCustomSkill("");
  }

  /* ---- Project helpers ---- */
  function addProject() {
    setProjects((prev) => [
      ...prev,
      { name: "", description: "", technologies: [], projectUrl: "", projectType: "personal" },
    ]);
  }
  function removeProject(idx: number) {
    setProjects((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateProject(idx: number, field: keyof ProjectDraft, value: string) {
    setProjects((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }
  function addTechToProject(idx: number) {
    const tech = (techInput[idx] ?? "").trim();
    if (!tech) return;
    setProjects((prev) =>
      prev.map((p, i) =>
        i === idx && !p.technologies.includes(tech)
          ? { ...p, technologies: [...p.technologies, tech] }
          : p,
      ),
    );
    setTechInput((prev) => ({ ...prev, [idx]: "" }));
  }
  function removeTechFromProject(idx: number, tech: string) {
    setProjects((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, technologies: p.technologies.filter((t) => t !== tech) } : p,
      ),
    );
  }

  /* ---- Multi-select toggle ---- */
  function toggleMulti(name: string, current: string[], setter: (v: string[]) => void) {
    setter(current.includes(name) ? current.filter((s) => s !== name) : [...current, name]);
  }

  /* ---- Loading state ---- */
  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-cp-lime" />
      </div>
    );
  }

  /* ---- Summary data for Review step ---- */
  const summaryItems = [
    { label: "Name", value: [firstName, lastName].filter(Boolean).join(" ") || "—" },
    {
      label: "Current status",
      value: currentStatus === OTHER_LABEL ? statusOther || "—" : currentStatus || "—",
    },
    { label: "Education", value: educationLevel || "—" },
    { label: "Degree", value: degree || "—" },
    { label: "Institution", value: university || "—" },
    { label: "Academic year", value: academicYear || "—" },
    { label: "Graduation", value: graduationYear || "—" },
    {
      label: "Experience",
      value: combineWithOther(experience, experienceOther).join(", ") || "—",
    },
    { label: "Projects", value: projectCount ? `${projectCount} project(s)` : "—" },
    { label: "Skills", value: skills.join(", ") || "—" },
    {
      label: "Learning",
      value: combineWithOther(learningHistory, learningOther).join(", ") || "—",
    },
    { label: "Career clarity", value: careerClarity || "—" },
    {
      label: "Biggest concern",
      value: biggestProblem === OTHER_LABEL ? problemOther || "—" : biggestProblem || "—",
    },
    { label: "Education prepares me", value: educationPrep || "—" },
    { label: "Weekly time", value: weeklyTime || "—" },
    { label: "Target role", value: targetRole || "—" },
  ];

  const knowMeChecklist = [
    "Your education",
    "Your institution",
    "Your current stage",
    "Your experience",
    "Your student-reported skills",
    "Your career situation",
    "Your career clarity",
    "Your biggest concern",
    "Your available time",
  ];

  /* ================================================================ */
  /* RENDER                                                            */
  /* ================================================================ */

  return (
    <div className="cp-onb-page min-h-screen px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-[720px]">
        <OnboardingHeader
          step={step}
          total={STEPS.length}
          label={STEPS[step]!.label}
          hint={STEPS[step]!.hint}
        />

        {/* Step content: kinetic entrance per step, spotlight border
            following the cursor (and showing at centre on keyboard focus,
            so the form stays fully usable without a mouse). */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mt-8"
        >
          <SpotlightCard className="card-surface p-6 sm:p-8">
          {/* ── Step 0: About You ──────────────────────────── */}
          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First name" required>
                <Input value={firstName} onChange={setFirstName} placeholder="Ada" />
              </Field>
              <Field label="Last name">
                <Input value={lastName} onChange={setLastName} placeholder="Lovelace" />
              </Field>
              {isLegacyUser && (
                <div className="sm:col-span-2 rounded-xl border border-cp-lime/20 bg-cp-lime/5 px-4 py-3">
                  <p className="text-[13px] font-semibold text-cp-lime">
                    Let's update your CareerPilot profile.
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    You already have some information saved. We've filled it in for you. Just review
                    and complete the missing steps below.
                  </p>
                </div>
              )}
              <div className="sm:col-span-2">
                <Field label="What are you currently doing?" required>
                  <OptionGrid
                    options={CURRENT_STATUS_OPTIONS}
                    selected={currentStatus}
                    onSelect={setCurrentStatus}
                  />
                  {currentStatus === OTHER_LABEL && (
                    <input
                      value={statusOther}
                      onChange={(e) => setStatusOther(e.target.value)}
                      placeholder="Tell us in your own words..."
                      className="mt-3 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-[13.5px] outline-none focus:border-cp-lime"
                    />
                  )}
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 1: Education ──────────────────────────── */}
          {step === 1 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Education level">
                  <OptionGrid
                    options={EDUCATION_LEVELS}
                    selected={educationLevel}
                    onSelect={(v) => setEducationLevel(educationLevel === v ? "" : v)}
                  />
                </Field>
              </div>
              <Field label="Degree / field of study">
                <Input value={degree} onChange={setDegree} placeholder="Computer Science" />
              </Field>
              <Field label="University or college">
                <UniversitySearch value={university} onChange={setUniversity} />
              </Field>
              <Field label="Current academic year">
                <OptionGrid
                  options={ACADEMIC_YEAR_OPTIONS}
                  selected={academicYear}
                  onSelect={(v) => setAcademicYear(academicYear === v ? "" : v)}
                />
              </Field>
              <Field label="Expected graduation year">
                <Input
                  value={graduationYear}
                  onChange={setGraduationYear}
                  placeholder="2026"
                  inputMode="numeric"
                />
              </Field>
            </div>
          )}

          {/* ── Step 2: Experience ─────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <Field label="Have you worked on real projects or gained practical experience?">
                <p className="mb-3 text-[12.5px] text-muted-foreground">Select all that apply.</p>
                <OptionGrid
                  options={EXPERIENCE_OPTIONS}
                  selected={experience}
                  onSelect={(v) => toggleMulti(v, experience, setExperience)}
                  multi
                />
                {experience.includes(OTHER_LABEL) && (
                  <input
                    value={experienceOther}
                    onChange={(e) => setExperienceOther(e.target.value)}
                    placeholder="Tell us in your own words..."
                    className="mt-3 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-[13.5px] outline-none focus:border-cp-lime"
                  />
                )}
              </Field>
              <Field label="How many meaningful projects have you completed?">
                <OptionGrid
                  options={PROJECT_COUNT_OPTIONS}
                  selected={projectCount}
                  onSelect={(v) => setProjectCount(projectCount === v ? "" : v)}
                />
              </Field>
            </div>
          )}

          {/* ── Step 3: Your Projects ──────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <p className="text-[12.5px] text-muted-foreground">
                Add projects you've built, even small ones. Each project turns your skills from
                "claims" into real evidence that CareerPilot can use for diagnosis and gap analysis.
                <span className="font-semibold text-foreground"> This step is optional</span>. You
                can always add projects later.
              </p>

              {projects.map((project, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-white/[0.02] p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-semibold text-muted-foreground">
                      Project {idx + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeProject(idx)}
                      className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-cp-lime/8 hover:text-cp-lime"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-[12px] font-semibold">Project name</label>
                      <input
                        value={project.name}
                        onChange={(e) => updateProject(idx, "name", e.target.value)}
                        placeholder="e.g. E-commerce website"
                        className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-[13px] outline-none focus:border-cp-lime"
                      />
                    </div>

                    <div>
                      <label className="text-[12px] font-semibold">What does it do?</label>
                      <textarea
                        value={project.description}
                        onChange={(e) => updateProject(idx, "description", e.target.value)}
                        placeholder="A short description of what the project does..."
                        rows={2}
                        className="mt-1 w-full resize-none rounded-xl border border-border bg-card px-3.5 py-2 text-[13px] outline-none focus:border-cp-lime"
                      />
                    </div>

                    <div>
                      <label className="text-[12px] font-semibold">Project type</label>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {PROJECT_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateProject(idx, "projectType", opt.value)}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                              project.projectType === opt.value
                                ? "border-cp-lime bg-cp-lime text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-cp-lime hover:text-cp-lime",
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[12px] font-semibold">
                        Technologies used
                        <span className="ml-1 text-muted-foreground">(press Enter to add)</span>
                      </label>
                      <div className="mt-1.5 flex gap-2">
                        <input
                          value={techInput[idx] ?? ""}
                          onChange={(e) =>
                            setTechInput((prev) => ({ ...prev, [idx]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTechToProject(idx);
                            }
                          }}
                          placeholder="e.g. React, Node.js, PostgreSQL"
                          className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2 text-[13px] outline-none focus:border-cp-lime"
                        />
                        <button
                          type="button"
                          onClick={() => addTechToProject(idx)}
                          className="flex items-center gap-1 rounded-xl border border-border px-2.5 py-2 text-[12px] font-semibold hover:border-cp-lime hover:text-cp-lime"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </button>
                      </div>
                      {project.technologies.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {project.technologies.map((tech) => (
                            <span
                              key={tech}
                              className="inline-flex items-center gap-1 rounded-full bg-cp-lime/8 px-2 py-0.5 text-[11px] font-medium text-cp-lime"
                            >
                              {tech}
                              <button
                                type="button"
                                onClick={() => removeTechFromProject(idx, tech)}
                                className="rounded-full hover:bg-cp-lime/15"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[12px] font-semibold">
                        Link <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <input
                        value={project.projectUrl}
                        onChange={(e) => updateProject(idx, "projectUrl", e.target.value)}
                        placeholder="https://github.com/you/project"
                        className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-[13px] outline-none focus:border-cp-lime"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}

              {projects.length < 5 && (
                <button
                  type="button"
                  onClick={addProject}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-cp-lime hover:text-cp-lime"
                >
                  <Plus className="h-4 w-4" /> Add a project
                </button>
              )}

              {projects.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <p className="text-[12.5px] text-muted-foreground">
                    No projects added yet. That's fine. You can skip this step and add projects
                    later from your dashboard.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Skills ─────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <p className="text-[12.5px] font-semibold">Student-reported skills</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Select what you already know. You can add your own too.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {catalog.map((s) => (
                    <Chip
                      key={s.id}
                      label={s.name}
                      active={skills.includes(s.name)}
                      onClick={() => toggleSkill(s.name)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[12.5px] font-semibold">Add your own</p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomSkill();
                      }
                    }}
                    placeholder="e.g. Data Storytelling"
                    className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-[13.5px] outline-none focus:border-cp-lime"
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-[13px] font-semibold hover:border-cp-lime hover:text-cp-lime"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>

              {skills.length > 0 && (
                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-[12.5px] font-semibold">
                    How confident are you with each skill? (optional)
                  </p>
                  <div className="space-y-2">
                    {skills.map((s) => (
                      <div key={s} className="flex items-center gap-3">
                        <span className="flex-1 text-[13px]">{s}</span>
                        <div className="flex gap-1.5">
                          {CONFIDENCE_LEVELS.map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() =>
                                setConfidence((prev) => ({
                                  ...prev,
                                  [s]: prev[s] === level ? "" : level,
                                }))
                              }
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                                confidence[s] === level
                                  ? "border-cp-lime bg-cp-lime text-primary-foreground"
                                  : "border-border text-muted-foreground hover:border-cp-lime hover:text-cp-lime",
                              )}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {skills.length === 0 && (
                <p className="text-[12.5px] text-muted-foreground">
                  No skills selected yet. You can always add them later.
                </p>
              )}
            </div>
          )}

          {/* ── Step 5: Career Direction ───────────────────── */}
          {step === 5 && (
            <div className="space-y-6">
              <Field label="How did you learn your skills?">
                <p className="mb-3 text-[12.5px] text-muted-foreground">Select all that apply.</p>
                <OptionGrid
                  options={LEARNING_HISTORY_OPTIONS}
                  selected={learningHistory}
                  onSelect={(v) => toggleMulti(v, learningHistory, setLearningHistory)}
                  multi
                />
                {learningHistory.includes(OTHER_LABEL) && (
                  <input
                    value={learningOther}
                    onChange={(e) => setLearningOther(e.target.value)}
                    placeholder="Tell us in your own words..."
                    className="mt-3 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-[13.5px] outline-none focus:border-cp-lime"
                  />
                )}
              </Field>

              <Field label="How clear are you about your career direction?">
                <OptionGrid
                  options={CAREER_CLARITY_OPTIONS}
                  selected={careerClarity}
                  onSelect={(v) => setCareerClarity(careerClarity === v ? "" : v)}
                />
              </Field>

              <Field label="Do you have any relevant certifications?">
                <div className="flex gap-2">
                  {(["yes", "no"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCertifications(certifications === opt ? "" : opt)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-[12.5px] font-medium transition-colors",
                        certifications === opt
                          ? "border-cp-lime bg-cp-lime text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-cp-lime hover:text-cp-lime",
                      )}
                    >
                      {opt === "yes" ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* ── Step 6: Your Situation ─────────────────────── */}
          {step === 6 && (
            <div className="space-y-6">
              <Field label="What is your biggest career problem right now?">
                <p className="mb-3 text-[12.5px] text-muted-foreground">
                  This is your perception, not our diagnosis.
                </p>
                <OptionGrid
                  options={BIGGEST_PROBLEM_OPTIONS}
                  selected={biggestProblem}
                  onSelect={(v) => setBiggestProblem(biggestProblem === v ? "" : v)}
                />
                {biggestProblem === OTHER_LABEL && (
                  <input
                    value={problemOther}
                    onChange={(e) => setProblemOther(e.target.value)}
                    placeholder="Tell us in your own words..."
                    className="mt-3 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-[13.5px] outline-none focus:border-cp-lime"
                  />
                )}
              </Field>

              <Field label="How well does your education prepare you for your target career?">
                <OptionGrid
                  options={EDUCATION_PREP_OPTIONS}
                  selected={educationPrep}
                  onSelect={(v) => setEducationPrep(educationPrep === v ? "" : v)}
                />
                {educationPrep && (
                  <input
                    value={educationPrepNote}
                    onChange={(e) => setEducationPrepNote(e.target.value)}
                    placeholder="What do you wish your university taught you? (optional)"
                    className="mt-3 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-[13.5px] outline-none focus:border-cp-lime"
                  />
                )}
              </Field>

              <Field label="How much time can you realistically spend on your career each week?">
                <OptionGrid
                  options={WEEKLY_TIME_OPTIONS}
                  selected={weeklyTime}
                  onSelect={(v) => setWeeklyTime(weeklyTime === v ? "" : v)}
                />
              </Field>
            </div>
          )}

          {/* ── Step 7: Target ─────────────────────────────── */}
          {step === 7 && (
            <div className="space-y-5">
              <Field label="Target role" required>
                <Input
                  value={targetRole}
                  onChange={setTargetRole}
                  placeholder="Senior Frontend Engineer"
                />
              </Field>
              <p className="text-[12.5px] text-muted-foreground">
                One clear goal keeps your roadmap, skills and guidance pointed in the same
                direction. You can change it any time from your profile.
              </p>
            </div>
          )}

          {/* ── Step 8: Final Setup ───────────────────────── */}
          {step === 8 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            >
              {/* Profile summary grouped by section */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Your CareerPilot Profile
              </p>

              {[
                {
                  title: "Personal",
                  items: summaryItems.filter((i) => ["Name", "Current status"].includes(i.label)),
                },
                {
                  title: "Education",
                  items: summaryItems.filter((i) =>
                    ["Education", "Degree", "Institution", "Academic year", "Graduation"].includes(
                      i.label,
                    ),
                  ),
                },
                {
                  title: "Experience & Skills",
                  items: summaryItems.filter((i) =>
                    ["Experience", "Projects", "Skills", "Learning"].includes(i.label),
                  ),
                },
                {
                  title: "Career Direction",
                  items: summaryItems.filter((i) =>
                    [
                      "Career clarity",
                      "Biggest concern",
                      "Education prepares me",
                      "Weekly time",
                      "Target role",
                    ].includes(i.label),
                  ),
                },
              ]
                .map((group) => ({
                  ...group,
                  items: group.items.filter((i) => i.value !== "\u2014"),
                }))
                .filter((group) => group.items.length > 0)
                .map((group, gi, arr) => (
                  <div
                    key={group.title}
                    className={cn(
                      "cp-onb-review-group",
                      gi < arr.length - 1 ? "border-b border-border pb-5 mb-5" : "",
                    )}
                  >
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {group.title}
                    </p>
                    <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                      {group.items.map((item) => (
                        <div key={item.label}>
                          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="mt-0.5 text-[13.5px] leading-relaxed">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

              {/* CareerPilot Now Knows */}
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  CareerPilot now knows
                </p>
                <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {knowMeChecklist.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-[12.5px]">
                      <Check className="h-3.5 w-3.5 shrink-0 text-cp-lime" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Completion message */}
              <div className="mt-6 rounded-xl border border-cp-lime/20 bg-cp-lime/5 px-4 py-3.5">
                <p className="text-[13px] font-semibold text-cp-lime">
                  {isReturningUser ? "Your profile has been updated." : "Your foundation is set."}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {isReturningUser
                    ? "Your market report, diagnosis and recommendations will refresh with your updated details."
                    : "Next, CareerPilot will analyse the roles and market that fit your direction."}
                </p>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error ? (
            <p className="mt-5 rounded-xl border border-cp-ember/30 bg-cp-ember/10 px-4 py-3 text-[12.5px] text-cp-ember">
              {error}
            </p>
          ) : null}
          </SpotlightCard>
        </motion.div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || save.isPending}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:invisible"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {/* MagneticButton has no disabled state, so the disabled and
              saving states render a plain button with the same look.
              The magnetic CTA only ever appears when it can be used. */}
          {step < STEPS.length - 1 ? (
            canContinue && !save.isPending ? (
              <MagneticButton
                onClick={goNext}
                maxPull={20}
                className="flex items-center gap-2 rounded-xl bg-cp-lime px-5 py-2.5 text-[13.5px] font-semibold text-cp-ink shadow-[0_0_24px_rgba(225,241,13,0.25)]"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </MagneticButton>
            ) : (
              <button
                type="button"
                disabled
                className="flex cursor-not-allowed items-center gap-2 rounded-xl bg-cp-lime px-5 py-2.5 text-[13.5px] font-semibold text-cp-ink opacity-50"
              >
                {save.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )
          ) : save.isPending ? (
            <button
              type="button"
              disabled
              className="flex cursor-not-allowed items-center gap-2 rounded-xl bg-cp-lime px-5 py-2.5 text-[13.5px] font-semibold text-cp-ink opacity-60"
            >
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </button>
          ) : (
            <MagneticButton
              onClick={finish}
              maxPull={20}
              className="flex items-center gap-2 rounded-xl bg-cp-lime px-5 py-2.5 text-[13.5px] font-semibold text-cp-ink shadow-[0_0_24px_rgba(225,241,13,0.25)]"
            >
              Continue <Check className="h-4 w-4" />
            </MagneticButton>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable sub-components                                             */
/* ------------------------------------------------------------------ */

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[12.5px] font-semibold">
        {label}
        {required ? <span className="text-cp-lime"> *</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric";
}) {
  return (
    <input
      value={value}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-[13.5px] outline-none transition-colors focus:border-cp-lime"
    />
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
        active
          ? "border-cp-lime bg-cp-lime text-primary-foreground"
          : "border-border text-muted-foreground hover:border-cp-lime hover:text-cp-lime",
      )}
    >
      {label}
    </button>
  );
}

/** Card-style option grid for single or multi-select. */
function OptionGrid({
  options,
  selected,
  onSelect,
  multi,
}: {
  options: string[];
  selected: string | string[];
  onSelect: (value: string) => void;
  multi?: boolean;
}) {
  const isActive = (opt: string) =>
    multi ? (selected as string[]).includes(opt) : selected === opt;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className={cn(
            "rounded-xl border px-3.5 py-2 text-[12.5px] font-medium transition-all",
            isActive(opt)
              ? "border-cp-lime bg-cp-lime/10 text-cp-lime"
              : "border-border text-muted-foreground hover:border-cp-lime/50 hover:text-foreground",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
