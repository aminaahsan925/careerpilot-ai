/**
 * Job intelligence server functions — Phase 5.
 *
 * Deterministic per job+user analysis over stored postings:
 * analyze, deep-dive, company posting frequency, and the
 * candidate-vs-company-vs-job three-way comparison.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const text = (value: unknown, max: number) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

async function intel() {
  return import("./jobs/intelligence");
}

/** List the user's stored postings, newest first. */
export const getStoredJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getStoredJobs: list } = await intel();
    return list(context.supabase, context.userId);
  });

/** Stored postings annotated with cached deterministic coverage. */
export const getStoredJobsWithCoverage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getStoredJobsWithCoverage: list } = await intel();
    return list(context.supabase, context.userId);
  });

/**
 * Deterministic candidate-vs-job gap for one stored posting.
 * Persists to `job_snapshots` (per user+job cache).
 */
export const analyzeStoredJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { jobId?: string }) => ({
    jobId: text(input?.jobId, 80),
  }))
  .handler(async ({ context, data }) => {
    if (!data.jobId) throw new Error("A posting is required.");
    const { analyzeJobPosting } = await intel();
    try {
      return await analyzeJobPosting(
        context.supabase,
        context.userId,
        data.jobId,
      );
    } catch (error) {
      console.error("[CareerPilot][analyzeStoredJob] failed", {
        userId: context.userId,
        jobId: data.jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

/** Deep-dive on one stored posting: requirements, provenance, URL check. */
export const getPostingDeepDive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { jobId?: string }) => ({
    jobId: text(input?.jobId, 80),
  }))
  .handler(async ({ context, data }) => {
    if (!data.jobId) throw new Error("A posting is required.");
    const { getPostingDeepDive: dive } = await intel();
    try {
      return await dive(context.supabase, context.userId, data.jobId);
    } catch (error) {
      console.error("[CareerPilot][getPostingDeepDive] failed", {
        userId: context.userId,
        jobId: data.jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

/** Requirement frequency across the user's stored postings for a company. */
export const getCompanyPostingFrequency = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { company?: string }) => ({
    company: text(input?.company, 160),
  }))
  .handler(async ({ context, data }) => {
    if (!data.company) throw new Error("A company name is required.");
    const { getCompanyPostingFrequency: freq } = await intel();
    return freq(context.supabase, context.userId, data.company);
  });

/** Candidate-vs-company-vs-job three-way comparison for one posting. */
export const getThreeWayComparison = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { jobId?: string }) => ({
    jobId: text(input?.jobId, 80),
  }))
  .handler(async ({ context, data }) => {
    if (!data.jobId) throw new Error("A posting is required.");
    const { getThreeWayComparison: compare } = await intel();
    try {
      return await compare(context.supabase, context.userId, data.jobId);
    } catch (error) {
      console.error("[CareerPilot][getThreeWayComparison] failed", {
        userId: context.userId,
        jobId: data.jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
