import { useEffect, useState, useRef } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Loader2,
  LogOut,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app/AppLayout";
import {
  useCurrentUser,
  useSaveProfile,
  type Skill,
} from "@/data/user";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CareerPilot AI" },
      { name: "description", content: "Manage your profile and knowledge." },
    ],
  }),
  component: ProfilePage,
});

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

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

/* BUG FIX (2026-10-30): these options diverged from the onboarding options
   ("I don't know yet", "Less than 3 hours", "3-5 hours", ...), so saved
   values showed as "Select..." in Edit and risked being overwritten on save.
   Keep both sets so any previously saved value still matches an option. */
const EDUCATION_PREP_OPTIONS = [
  "Very well",
  "Somewhat",
  "Not much",
  "I don't know yet",
  "My university prepares me well",
  "Somewhat prepares me",
  "Not really preparing me",
  "Not preparing me at all",
];

const WEEKLY_HOURS_OPTIONS = [
  "Less than 3 hours",
  "3-5 hours",
  "5-10 hours",
  "10-15 hours",
  "15+ hours",
  "Less than 5 hours",
  "10-20 hours",
  "20-30 hours",
  "More than 30 hours",
];

/* BUG FIX (2026-10-30): onboarding saves experience / learning_history as
   JSON-stringified arrays (e.g. '["No projects yet"]') into text columns,
   while Profile treated them as plain strings. Unwrap them for display and
   for single-select editing (first item), so Edit no longer shows "Select..."
   for a saved value and Save no longer risks blanking it. */
function parseStoredList(value: string | null | undefined): string[] {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) return [trimmed];
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    // Fall through to the raw value below.
  }
  return [trimmed];
}

function displayStoredValue(value: string | null | undefined): string {
  return parseStoredList(value).join(", ");
}

function firstStoredValue(value: string | null | undefined): string {
  return parseStoredList(value)[0] ?? "";
}

const EDUCATION_LEVELS = ["High School", "Diploma", "Bachelor's", "Master's", "PhD", "Self-taught"];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser();
  const saveMutation = useSaveProfile();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile form state
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [currentRole, setCurrentRole] = useState(user?.profile?.current_role ?? "");
  const [educationLevel, setEducationLevel] = useState(user?.profile?.education_level ?? "");
  const [degree, setDegree] = useState(user?.profile?.degree ?? "");
  const [university, setUniversity] = useState(user?.profile?.university ?? "");
  const [graduationYear, setGraduationYear] = useState(
    user?.profile?.graduation_year?.toString() ?? "",
  );

  // Know Me fields
  const [currentStatus, setCurrentStatus] = useState(user?.profile?.current_status ?? "");
  const [academicYear, setAcademicYear] = useState(user?.profile?.academic_year ?? "");
  const [experience, setExperience] = useState(firstStoredValue(user?.profile?.experience));
  const [projectCount, setProjectCount] = useState(user?.profile?.project_count ?? "");
  const [learningHistory, setLearningHistory] = useState(
    firstStoredValue(user?.profile?.learning_history),
  );
  const [certifications, setCertifications] = useState(user?.profile?.certifications ?? "");
  const [careerClarity, setCareerClarity] = useState(user?.profile?.career_clarity ?? "");
  const [biggestProblem, setBiggestProblem] = useState(user?.profile?.biggest_problem ?? "");
  const [educationPrep, setEducationPrep] = useState(user?.profile?.education_prep ?? "");
  const [educationPrepNote, setEducationPrepNote] = useState(
    user?.profile?.education_prep_note ?? "",
  );
  const [weeklyHours, setWeeklyHours] = useState(user?.profile?.weekly_hours ?? "");

  // Skills
  const [skills, setSkills] = useState<Skill[]>(user?.skills ?? []);
  const [newSkillName, setNewSkillName] = useState("");
  const [showSkillInput, setShowSkillInput] = useState(false);

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar ?? "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user || editing) return;

    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setCurrentRole(user.profile?.current_role ?? "");
    setEducationLevel(user.profile?.education_level ?? "");
    setDegree(user.profile?.degree ?? "");
    setUniversity(user.profile?.university ?? "");
    setGraduationYear(user.profile?.graduation_year?.toString() ?? "");
    setCurrentStatus(user.profile?.current_status ?? "");
    setAcademicYear(user.profile?.academic_year ?? "");
    setExperience(firstStoredValue(user.profile?.experience));
    setProjectCount(user.profile?.project_count ?? "");
    setLearningHistory(firstStoredValue(user.profile?.learning_history));
    setCertifications(user.profile?.certifications ?? "");
    setCareerClarity(user.profile?.career_clarity ?? "");
    setBiggestProblem(user.profile?.biggest_problem ?? "");
    setEducationPrep(user.profile?.education_prep ?? "");
    setEducationPrepNote(user.profile?.education_prep_note ?? "");
    setWeeklyHours(user.profile?.weekly_hours ?? "");
    setSkills(user.skills ?? []);
    setAvatarUrl(user.avatar ?? "");
  }, [user, editing]);

  if (isLoading) {
    return (
      <AppLayout title="Profile" subtitle="Loading your profile…">
        <div className="mx-auto w-full max-w-[720px] space-y-4">
          <div className="h-32 w-full rounded-xl bg-muted" />
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout title="Profile" subtitle="">
        <div className="mx-auto max-w-md text-center">
          <p className="text-[15px] font-semibold text-foreground">Profile not available</p>
          <p className="mt-2 text-[13px] text-muted-foreground">Please sign in to view your profile.</p>
        </div>
      </AppLayout>
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveMutation.mutateAsync({
        profile: {
          first_name: firstName,
          last_name: lastName,
          education_level: educationLevel || null,
          degree: degree || null,
          university: university || null,
          graduation_year: graduationYear ? parseInt(graduationYear) : null,
          current_role: currentRole || null,
          current_status: currentStatus || null,
          academic_year: academicYear || null,
          experience: experience || null,
          project_count: projectCount || null,
          learning_history: learningHistory || null,
          certifications: certifications || null,
          career_clarity: careerClarity || null,
          biggest_problem: biggestProblem || null,
          education_prep: educationPrep || null,
          education_prep_note: educationPrepNote || null,
          weekly_hours: weeklyHours || null,
        },
        skills: skills.map(({ name, level }) => ({ name, level })),
        });
      toast.success("Profile saved successfully");
      setEditing(false);
    } catch (error) {
      toast.error("Failed to save profile");
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.userId}-${Date.now()}.${fileExt}`;
      const filePath = `${user.userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error("Failed to upload photo");
      console.error(error);
    } finally {
      setUploading(false);
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      await router.navigate({ to: "/auth", search: { redirect: undefined, reset: undefined } });
    } catch {
      toast.error("Couldn't sign out. Please try again.");
    }
  }

  function addSkill() {
    if (!newSkillName.trim()) return;
    const name = newSkillName.trim();
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Skill already added");
      return;
    }
    const newSkill: Skill = {
      id: `temp-${Date.now()}`,
      skillId: `temp-${Date.now()}`,
      name,
      category: "General",
      level: 50,
    };
    setSkills([...skills, newSkill]);
    setNewSkillName("");
    setShowSkillInput(false);
  }

  function removeSkill(skillId: string) {
    setSkills(skills.filter((s) => s.id !== skillId));
  }

  function updateSkillLevel(skillId: string, level: number) {
    setSkills(skills.map((s) => (s.id === skillId ? { ...s, level } : s)));
  }

  return (
    <AppLayout title="Profile" subtitle="Manage your profile and knowledge">
      <div className="mx-auto w-full max-w-[720px] space-y-8">
        {/* Profile Photo Section */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card-surface p-6"
        >
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-full bg-muted">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile photo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                    {user.initials}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-terracotta text-white shadow-md transition hover:bg-terracotta/90 disabled:opacity-50"
                aria-label="Upload profile photo"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
            <div className="flex-1">
              <h2 className="text-[18px] font-bold text-foreground">{user.fullName}</h2>
              <p className="text-[13px] text-muted-foreground">{user.email}</p>
              {user.role && <p className="mt-1 text-[12.5px] font-medium text-terracotta">{user.role}</p>}
            </div>
          </div>
        </motion.section>

        {/* Basic Info Section */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="card-surface p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold uppercase tracking-[0.12em] text-foreground">Basic Information</h3>
            {!editing && (
              <button type="button" onClick={() => setEditing(true)} className="text-[12px] font-semibold text-terracotta hover:underline">
                Edit
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="First Name" value={firstName} onChange={setFirstName} editing={editing} />
            <ProfileField label="Last Name" value={lastName} onChange={setLastName} editing={editing} />
            <ProfileField label="Current Role" value={currentRole} onChange={setCurrentRole} editing={editing} placeholder="e.g. Frontend Developer" />
            <ProfileField label="Education Level" value={educationLevel} onChange={setEducationLevel} editing={editing} type="select" options={EDUCATION_LEVELS} />
            <ProfileField label="Degree" value={degree} onChange={setDegree} editing={editing} placeholder="e.g. BS Computer Science" />
            <ProfileField label="University" value={university} onChange={setUniversity} editing={editing} />
            <ProfileField label="Graduation Year" value={graduationYear} onChange={setGraduationYear} editing={editing} placeholder="e.g. 2026" />
          </div>
        </motion.section>

        {/* Know Me Section */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="card-surface p-6"
        >
          <h3 className="mb-4 text-[14px] font-bold uppercase tracking-[0.12em] text-foreground">Know Me</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="Current Status" value={currentStatus} onChange={setCurrentStatus} editing={editing} type="select" options={CURRENT_STATUS_OPTIONS} />
            <ProfileField label="Academic Year" value={academicYear} onChange={setAcademicYear} editing={editing} type="select" options={ACADEMIC_YEAR_OPTIONS} />
            <ProfileField label="Experience" value={experience} onChange={setExperience} editing={editing} type="select" options={EXPERIENCE_OPTIONS} />
            <ProfileField label="Project Count" value={projectCount} onChange={setProjectCount} editing={editing} type="select" options={PROJECT_COUNT_OPTIONS} />
            <ProfileField label="Learning History" value={learningHistory} onChange={setLearningHistory} editing={editing} type="select" options={LEARNING_HISTORY_OPTIONS} />
            <ProfileField label="Career Clarity" value={careerClarity} onChange={setCareerClarity} editing={editing} type="select" options={CAREER_CLARITY_OPTIONS} />
            <ProfileField label="Biggest Problem" value={biggestProblem} onChange={setBiggestProblem} editing={editing} type="select" options={BIGGEST_PROBLEM_OPTIONS} />
            <ProfileField label="Education Preparation" value={educationPrep} onChange={setEducationPrep} editing={editing} type="select" options={EDUCATION_PREP_OPTIONS} />
            <ProfileField label="Weekly Study Hours" value={weeklyHours} onChange={setWeeklyHours} editing={editing} type="select" options={WEEKLY_HOURS_OPTIONS} />
            <div className="sm:col-span-2">
              <ProfileField label="Certifications" value={certifications} onChange={setCertifications} editing={editing} placeholder="List your certifications..." />
            </div>
            <div className="sm:col-span-2">
              <ProfileField label="Education Prep Note" value={educationPrepNote} onChange={setEducationPrepNote} editing={editing} placeholder="Additional notes about your education..." />
            </div>
          </div>
        </motion.section>

        {/* Skills Section */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="card-surface p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold uppercase tracking-[0.12em] text-foreground">Skills & Knowledge</h3>
            {editing && (
              <button type="button" onClick={() => setShowSkillInput(true)} className="flex items-center gap-1.5 text-[12px] font-semibold text-terracotta hover:underline">
                <Plus className="h-3.5 w-3.5" />
                Add Skill
              </button>
            )}
          </div>

          <AnimatePresence>
            {showSkillInput && editing && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addSkill();
                    if (e.key === "Escape") { setShowSkillInput(false); setNewSkillName(""); }
                  }}
                  placeholder="Enter skill name..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-terracotta"
                  autoFocus
                />
                <button type="button" onClick={addSkill} className="rounded-lg bg-terracotta px-3 py-2 text-[12px] font-semibold text-white">Add</button>
                <button type="button" onClick={() => { setShowSkillInput(false); setNewSkillName(""); }} className="rounded-lg border border-border px-3 py-2 text-[12px] text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {skills.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">No skills added yet. Click "Add Skill" to get started.</p>
          ) : (
            <div className="space-y-2">
              {skills.map((skill) => (
                <motion.div key={skill.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">{skill.name}</p>
                    <p className="text-[11px] text-muted-foreground">{skill.category}</p>
                  </div>
                  {editing ? (
                    <>
                      <input type="range" min="0" max="100" value={skill.level} onChange={(e) => updateSkillLevel(skill.id, parseInt(e.target.value))} className="w-24 accent-terracotta" />
                      <span className="w-8 text-right text-[11px] font-medium text-muted-foreground">{skill.level}%</span>
                      <button type="button" onClick={() => removeSkill(skill.id)} className="rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${skill.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-terracotta" style={{ width: `${skill.level}%` }} />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Logout Section */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="card-surface p-6"
        >
          <h3 className="mb-4 text-[14px] font-bold uppercase tracking-[0.12em] text-foreground">Account</h3>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border px-5 py-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </motion.section>

        {/* Save Button */}
        <AnimatePresence>
          {editing && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-border px-5 py-2.5 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground">Cancel</button>
              <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-terracotta px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-sm disabled:opacity-50">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save Changes</>}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Profile Field Component                                             */
/* ------------------------------------------------------------------ */

function ProfileField({
  label,
  value,
  onChange,
  editing,
  type = "text",
  options = [],
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
  type?: "text" | "select";
  options?: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</label>
      {editing ? (
        type === "select" ? (
          <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-terracotta">
            <option value="">Select...</option>
            {/* Keep a saved value visible even if it is not in the option list,
                instead of silently falling back to "Select...". */}
            {value && !options.includes(value) && <option value={value}>{value}</option>}
            {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
          </select>
        ) : (
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-terracotta" />
        )
      ) : (
        <div className="min-h-[40px] rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-[13px] text-foreground">
          {displayStoredValue(value) || <span className="text-muted-foreground">Not set</span>}
        </div>
      )}
    </div>
  );
}
