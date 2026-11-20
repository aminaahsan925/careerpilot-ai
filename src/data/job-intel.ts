import { useQuery } from "@tanstack/react-query";

import {
  analyzeStoredJob,
  getCompanyPostingFrequency,
  getPostingDeepDive,
  getStoredJobs,
  getStoredJobsWithCoverage,
  getThreeWayComparison,
} from "@/lib/job-intel.functions";
import { friendlyError } from "./user";

export type StoredJob = Awaited<ReturnType<typeof getStoredJobs>>[number];
export type StoredJobWithCoverage = Awaited<
  ReturnType<typeof getStoredJobsWithCoverage>
>[number];
export type PostingDeepDive = Awaited<ReturnType<typeof getPostingDeepDive>>;
export type CompanyPostingFrequency = Awaited<
  ReturnType<typeof getCompanyPostingFrequency>
>;
export type ThreeWayComparison = Awaited<
  ReturnType<typeof getThreeWayComparison>
>;
export type JobAnalysis = Awaited<ReturnType<typeof analyzeStoredJob>>;

const JOBS_KEY = ["job-intel", "stored-jobs"] as const;
const jobAnalysisKey = (jobId: string) =>
  ["job-intel", "analysis", jobId] as const;
const deepDiveKey = (jobId: string) =>
  ["job-intel", "deep-dive", jobId] as const;
const companyFreqKey = (company: string) =>
  ["job-intel", "company-frequency", company.trim().toLowerCase()] as const;
const threeWayKey = (jobId: string) =>
  ["job-intel", "three-way", jobId] as const;

function wrap<T>(label: string, run: () => Promise<T>, friendly: string) {
  return async () => {
    console.info(`[CareerPilot][client][${label}] request`);
    try {
      const result = await run();
      console.info(`[CareerPilot][client][${label}] success`);
      return result;
    } catch (error) {
      console.error(`[CareerPilot][client][${label}] failed`, error);
      throw new Error(friendlyError(error, friendly));
    }
  };
}

/** The user's stored postings, newest first. */
export function useStoredJobs() {
  return useQuery({
    queryKey: JOBS_KEY,
    queryFn: wrap(
      "getStoredJobs",
      () => getStoredJobs(),
      "Saved postings couldn't be loaded.",
    ),
    staleTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** Stored postings annotated with cached deterministic coverage. */
export function useStoredJobsWithCoverage() {
  return useQuery({
    queryKey: [...JOBS_KEY, "with-coverage"] as const,
    queryFn: wrap(
      "getStoredJobsWithCoverage",
      () => getStoredJobsWithCoverage(),
      "Saved postings couldn't be loaded.",
    ),
    staleTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** Deterministic candidate-vs-job gap for one posting (cached per job+user). */
export function useJobAnalysis(jobId: string | null) {
  const id = (jobId ?? "").trim();
  return useQuery({
    queryKey: jobAnalysisKey(id || "none"),
    queryFn: wrap(
      "analyzeStoredJob",
      () => analyzeStoredJob({ data: { jobId: id } }),
      "The posting analysis couldn't be computed.",
    ),
    enabled: id.length > 0,
    staleTime: 30 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** Deep-dive on one posting: requirements, provenance, URL validation. */
export function usePostingDeepDive(jobId: string | null) {
  const id = (jobId ?? "").trim();
  return useQuery({
    queryKey: deepDiveKey(id || "none"),
    queryFn: wrap(
      "getPostingDeepDive",
      () => getPostingDeepDive({ data: { jobId: id } }),
      "The posting deep-dive couldn't be loaded.",
    ),
    enabled: id.length > 0,
    staleTime: 30 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** Requirement frequency across the user's stored postings for a company. */
export function useCompanyPostingFrequency(company: string | null) {
  const name = (company ?? "").trim();
  return useQuery({
    queryKey: companyFreqKey(name || "none"),
    queryFn: wrap(
      "getCompanyPostingFrequency",
      () => getCompanyPostingFrequency({ data: { company: name } }),
      "Posting frequency couldn't be loaded.",
    ),
    enabled: name.length > 0,
    staleTime: 30 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** Candidate-vs-company-vs-job three-way comparison for one posting. */
export function useThreeWayComparison(jobId: string | null) {
  const id = (jobId ?? "").trim();
  return useQuery({
    queryKey: threeWayKey(id || "none"),
    queryFn: wrap(
      "getThreeWayComparison",
      () => getThreeWayComparison({ data: { jobId: id } }),
      "The comparison couldn't be loaded.",
    ),
    enabled: id.length > 0,
    staleTime: 30 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
