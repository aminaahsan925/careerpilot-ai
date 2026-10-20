import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { analyzeResume } from "@/lib/resume.functions";

export type ResumeRecord = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
};

export type Recommendation = { title: string; impact: string };
export type RoleMatch = { role: string; match: number };

export type ResumeAnalysis = {
  id: string;
  resume_id: string | null;
  ats_score: number;
  resume_score: number;
  career_match: number;
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  detected_skills: string[];
  recommendations: Recommendation[];
  role_matches: RoleMatch[];
  created_at: string;
};

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(row: any): ResumeAnalysis {
  return {
    id: row.id,
    resume_id: row.resume_id,
    ats_score: row.ats_score ?? 0,
    resume_score: row.resume_score ?? 0,
    career_match: row.career_match ?? 0,
    summary: row.summary ?? null,
    strengths: asStrings(row.strengths),
    weaknesses: asStrings(row.weaknesses),
    detected_skills: asStrings(row.detected_skills),
    recommendations: Array.isArray(row.recommendations) ? row.recommendations : [],
    role_matches: Array.isArray(row.role_matches) ? row.role_matches : [],
    created_at: row.created_at,
  };
}

export function useLatestResume() {
  return useQuery({
    queryKey: ["latest-resume"],
    queryFn: async (): Promise<ResumeRecord | null> => {
      const { data, error } = await supabase
        .from("resumes")
        .select("id, file_name, file_path, file_size, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("[Resume] useLatestResume query error:", error.message, error);
        throw error;
      }
      return (data as ResumeRecord | null) ?? null;
    },
  });
}

export function useLatestAnalysis() {
  return useQuery({
    queryKey: ["latest-analysis"],
    queryFn: async (): Promise<ResumeAnalysis | null> => {
      const { data, error } = await supabase
        .from("resume_analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("[Resume] useLatestAnalysis query error:", error.message, error);
        throw error;
      }
      return data ? normalize(data) : null;
    },
  });
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = [".pdf", ".docx", ".txt"];

/** Extracts a human-readable message from Supabase errors (plain objects, not Error instances). */
function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e["message"] === "string") return e["message"];
    if (typeof e["msg"] === "string") return e["msg"];
    try {
      return JSON.stringify(err);
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

/** Uploads to private storage, records the row, then runs the AI analysis. */
export function useUploadAndAnalyze() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const lower = file.name.toLowerCase();
      if (!ALLOWED.some((ext) => lower.endsWith(ext)))
        throw new Error("Upload a PDF, DOCX or TXT resume.");
      if (file.size > MAX_BYTES) throw new Error("That file is larger than 5MB.");

      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user)
        throw new Error("Your session has expired. Please sign in again.");

      const path = `${auth.user.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const uploadOptions = file.type
        ? { upsert: false, contentType: file.type }
        : { upsert: false };
      const upload = await supabase.storage.from("resumes").upload(path, file, uploadOptions);
      if (upload.error) {
        const msg = extractMessage(upload.error, "File upload failed");
        console.error("[Resume] storage upload error:", upload.error);
        throw new Error(msg);
      }

      const { data: resume, error: insertError } = await supabase
        .from("resumes")
        .insert({
          user_id: auth.user.id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
        })
        .select("id")
        .single();
      if (insertError) {
        // Avoid leaving private files behind when the metadata row cannot be saved.
        await supabase.storage.from("resumes").remove([path]);
        const msg = extractMessage(insertError, "Could not save resume metadata");
        console.error("[Resume] DB insert error:", insertError);
        throw new Error(msg);
      }

      try {
        return await analyzeResume({ data: { resumeId: resume.id as string } });
      } catch (err) {
        const msg = extractMessage(err, "AI analysis failed");
        console.error("[Resume] analyzeResume error:", err);
        throw new Error(msg);
      }
    },
    onSuccess: (result) => {
      // Show the newly-created analysis immediately. The refetch below is
      // still useful for reconciling server state, but should not leave the
      // user looking at the previous score while it runs.
      queryClient.setQueryData(["latest-analysis"], result);
      queryClient.invalidateQueries({ queryKey: ["latest-resume"] });
      queryClient.invalidateQueries({ queryKey: ["latest-analysis"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["career-overview"] });
    },
  });
}

/** Re-runs the AI analysis on an already-uploaded resume (no re-upload needed). */
export function useReanalyze() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (resumeId: string) => analyzeResume({ data: { resumeId } }),
    onSuccess: (result) => {
      queryClient.setQueryData(["latest-analysis"], result);
      queryClient.invalidateQueries({ queryKey: ["latest-analysis"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["career-overview"] });
    },
  });
}
