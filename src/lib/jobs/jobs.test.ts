import { describe, expect, it } from "vitest";

import { aggregateSkillFrequency, jobCoverageReport } from "./coverage";
import {
  buildJobSearchQueries,
  dedupHashJob,
  extractCompany,
  formatLocationFilter,
  locationCacheKey,
  type JobLocationFilter,
  type JobProvider,
  type NormalizedJobPosting,
} from "./providers";
import {
  parseRequirementExtraction,
  toRequirementInputs,
} from "./requirements";
import type { EvidenceInput } from "../evidence/matching";

/* ------------------------------------------------------------------ */
/* Stub JobProvider — interface contract                                */
/* ------------------------------------------------------------------ */

class StubJobProvider implements JobProvider {
  readonly name = "stub";
  constructor(private readonly postings: NormalizedJobPosting[]) {}
  async searchJobs(): Promise<NormalizedJobPosting[]> {
    return this.postings;
  }
}

const CANNED: NormalizedJobPosting[] = [
  {
    externalId: "ext-1",
    title: "Junior Frontend Developer",
    company: "Acme",
    country: "Pakistan",
    city: "Lahore",
    remoteType: "hybrid",
    url: "https://example.com/jobs/1",
    description: "React and TypeScript required.",
    publishedAt: "2026-09-01T00:00:00.000Z",
  },
];

describe("JobProvider contract (stub)", () => {
  it("searchJobs resolves to normalized postings", async () => {
    const provider: JobProvider = new StubJobProvider(CANNED);
    expect(provider.name).toBe("stub");
    const postings = await provider.searchJobs({
      targetRole: "Frontend Developer",
      location: { country: "Pakistan", city: "Lahore", workMode: null },
    });
    expect(postings).toHaveLength(1);
    expect(postings[0]?.title).toBe("Junior Frontend Developer");
    expect(postings[0]?.url).toBe("https://example.com/jobs/1");
    expect(postings[0]?.remoteType).toBe("hybrid");
  });
});

/* ------------------------------------------------------------------ */
/* Location helpers                                                     */
/* ------------------------------------------------------------------ */

describe("location helpers", () => {
  it("formats city + country", () => {
    const loc: JobLocationFilter = {
      country: "Pakistan",
      city: "Lahore",
      workMode: null,
    };
    expect(formatLocationFilter(loc)).toBe("Lahore, Pakistan");
  });

  it("falls back to Remote / null", () => {
    expect(
      formatLocationFilter({ country: null, city: null, workMode: "remote" }),
    ).toBe("Remote");
    expect(
      formatLocationFilter({ country: null, city: null, workMode: null }),
    ).toBeNull();
  });

  it("cache keys distinguish filters", () => {
    const a = locationCacheKey({
      country: "Pakistan",
      city: "Lahore",
      workMode: null,
    });
    const b = locationCacheKey({
      country: "Pakistan",
      city: "Karachi",
      workMode: null,
    });
    const c = locationCacheKey({ country: null, city: null, workMode: null });
    const d = locationCacheKey({
      country: null,
      city: null,
      workMode: "remote",
    });
    expect(a).not.toBe(b);
    expect(c).toBe("global");
    expect(d).not.toBe(c);
    // Case-insensitive: same filter, different casing → same key.
    expect(
      locationCacheKey({ country: "pakistan", city: "lahore", workMode: null }),
    ).toBe(a);
  });

  it("search queries include the location scope", () => {
    const queries = buildJobSearchQueries({
      targetRole: "Backend Developer",
      location: { country: "Pakistan", city: null, workMode: null },
    });
    expect(queries.length).toBeGreaterThan(0);
    expect(queries.every((q) => q.includes("Pakistan"))).toBe(true);
    expect(queries.every((q) => q.includes("Backend Developer"))).toBe(true);
  });
});

describe("extractCompany", () => {
  it("parses 'at Company' titles", () => {
    expect(
      extractCompany(
        "Junior Developer at Acme Corp",
        "https://acme.com/jobs/1",
      ),
    ).toBe("Acme Corp");
  });

  it("falls back to the posting domain", () => {
    expect(
      extractCompany(
        "We are hiring engineers",
        "https://boards.greenhouse.io/acme/jobs/1",
      ),
    ).toBe("greenhouse");
  });

  it("returns null rather than guessing", () => {
    expect(extractCompany("We are hiring", "not-a-url")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Dedup hash                                                           */
/* ------------------------------------------------------------------ */

describe("dedupHashJob", () => {
  const posting = {
    title: "Junior Frontend Developer",
    company: "Acme",
    country: "Pakistan",
    city: "Lahore",
    url: "https://example.com/jobs/1",
    description: "React and TypeScript required. Apply now.",
  };

  it("is deterministic", () => {
    expect(dedupHashJob(posting)).toBe(dedupHashJob({ ...posting }));
  });

  it("is insensitive to case and whitespace noise", () => {
    expect(
      dedupHashJob({ ...posting, title: "  junior FRONTEND developer " }),
    ).toBe(dedupHashJob(posting));
  });

  it("changes when the posting changes", () => {
    expect(dedupHashJob({ ...posting, company: "Globex" })).not.toBe(
      dedupHashJob(posting),
    );
    expect(
      dedupHashJob({
        ...posting,
        description: "Completely different text here.",
      }),
    ).not.toBe(dedupHashJob(posting));
  });

  it("produces hex strings", () => {
    expect(dedupHashJob(posting)).toMatch(/^[0-9a-f]{16}$/);
  });
});

/* ------------------------------------------------------------------ */
/* Requirement extraction schemas                                       */
/* ------------------------------------------------------------------ */

describe("parseRequirementExtraction", () => {
  it("accepts a valid extraction payload", () => {
    const result = parseRequirementExtraction({
      must_have_skills: ["React", "TypeScript"],
      preferred_skills: ["GraphQL"],
      responsibilities: ["Build UI components"],
      years_experience: "2+ years",
    });
    expect(result.must_have_skills).toEqual(["React", "TypeScript"]);
    expect(result.years_experience).toBe("2+ years");
  });

  it("fills defaults for missing optional fields", () => {
    const result = parseRequirementExtraction({ must_have_skills: ["Python"] });
    expect(result.preferred_skills).toEqual([]);
    expect(result.years_experience).toBeNull();
  });

  it("rejects malformed output instead of degrading", () => {
    expect(() =>
      parseRequirementExtraction({ must_have_skills: "not-an-array" }),
    ).toThrow();
    expect(() =>
      parseRequirementExtraction({ must_have_skills: ["x".repeat(121)] }),
    ).toThrow();
  });
});

describe("toRequirementInputs", () => {
  it("maps importance and canonicalizes skills", () => {
    const inputs = toRequirementInputs({
      must_have_skills: ["postgres", "React"],
      preferred_skills: ["react", "Docker"],
      responsibilities: [],
      years_experience: null,
    });
    const bySkill = new Map(inputs.map((i) => [i.skill, i.importance]));
    // "postgres" → canonical "PostgreSQL"; duplicate "react"/"React" collapses,
    // keeping the stronger must_have importance.
    expect(bySkill.get("PostgreSQL")).toBe("must_have");
    expect(bySkill.get("React")).toBe("must_have");
    expect(bySkill.get("Docker")).toBe("preferred");
    expect(inputs).toHaveLength(3);
  });

  it("drops empty skills", () => {
    expect(
      toRequirementInputs({
        must_have_skills: ["", "   "],
        preferred_skills: [],
        responsibilities: [],
        years_experience: null,
      }),
    ).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* Per-job coverage                                                     */
/* ------------------------------------------------------------------ */

const EVIDENCE: EvidenceInput[] = [
  {
    id: "e1",
    skill_key: "React",
    evidence_strength: 3,
    confidence: 0.9,
    verification_status: "verified",
    source_type: "project",
  },
  {
    id: "e2",
    skill_key: "TypeScript",
    evidence_strength: 2,
    confidence: 0.8,
    verification_status: "extracted",
    source_type: "project",
  },
];

describe("jobCoverageReport", () => {
  it("matches job requirements against candidate evidence", () => {
    const report = jobCoverageReport(
      {
        id: "job-1",
        title: "Frontend Developer",
        company: "Acme",
        url: "https://example.com/jobs/1",
        requirements: [
          { skill: "React", importance: "must_have" },
          { skill: "GraphQL", importance: "preferred" },
        ],
      },
      EVIDENCE,
    );
    expect(report.jobId).toBe("job-1");
    expect(report.coverage.total).toBe(2);
    expect(report.coverage.criticalGaps).toHaveLength(0);
    // React is PROVEN (must_have) → full weight; GraphQL MISSING (preferred) → 0.
    // (1*2 + 0*1) / (2 + 1) = 67%
    expect(report.coverage.coveragePct).toBe(67);
  });

  it("flags missing must-haves as critical gaps", () => {
    const report = jobCoverageReport(
      {
        id: "job-2",
        title: "Backend Developer",
        company: null,
        url: null,
        requirements: [{ skill: "Kubernetes", importance: "must_have" }],
      },
      EVIDENCE,
    );
    expect(report.coverage.criticalGaps.map((g) => g.skill)).toEqual([
      "Kubernetes",
    ]);
    expect(report.coverage.coveragePct).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Cache-key composition                                              */
/* ------------------------------------------------------------------ */

describe("cache-key composition", () => {
  it("tech-trends topic includes the category", async () => {
    const { techTrendsTopic } = await import("../cache-keys");
    expect(techTrendsTopic("AI")).not.toBe(techTrendsTopic("Cloud"));
    expect(techTrendsTopic("AI")).toBe(techTrendsTopic("AI"));
    expect(techTrendsTopic("")).toBe(techTrendsTopic("All"));
  });

  it("market cache key includes dataset version + location", async () => {
    const { marketCacheKey } = await import("../market.server");
    const base = marketCacheKey("Frontend Developer", "2026.08.31", null);
    expect(marketCacheKey("Frontend Developer", "2026.08.31", null)).toBe(base);
    // Dataset update → different key (stale reports never served).
    expect(marketCacheKey("Frontend Developer", "2026.09.01", null)).not.toBe(
      base,
    );
    // Location scope → different key.
    expect(
      marketCacheKey("Frontend Developer", "2026.08.31", "Lahore, Pakistan"),
    ).not.toBe(base);
    expect(
      marketCacheKey("Frontend Developer", "2026.08.31", "Remote"),
    ).not.toBe(
      marketCacheKey("Frontend Developer", "2026.08.31", "Lahore, Pakistan"),
    );
  });
});

/* ------------------------------------------------------------------ */
/* Market aggregation                                                   */
/* ------------------------------------------------------------------ */

describe("aggregateSkillFrequency", () => {
  it("computes real counts from stored jobs", () => {
    const agg = aggregateSkillFrequency([
      {
        requirements: [
          { skill: "React", importance: "must_have" },
          { skill: "TypeScript", importance: "must_have" },
        ],
      },
      {
        requirements: [
          { skill: "react", importance: "preferred" },
          { skill: "Docker", importance: "must_have" },
        ],
      },
      {
        requirements: [{ skill: "postgres", importance: "must_have" }],
      },
    ]);

    expect(agg.jobsAnalysed).toBe(3);
    expect(agg.requirementsSeen).toBe(5);

    const react = agg.skills.find((s) => s.skill === "React");
    expect(react?.mustHave).toBe(1);
    expect(react?.preferred).toBe(1);
    expect(react?.total).toBe(2);
    expect(react?.shareOfJobs).toBeCloseTo(0.67, 2);

    // Canonicalization: "postgres" counts as PostgreSQL.
    expect(agg.skills.find((s) => s.skill === "PostgreSQL")?.total).toBe(1);

    // Sorted by total descending.
    expect(agg.skills[0]?.skill).toBe("React");
  });

  it("counts each skill once per job for share math", () => {
    const agg = aggregateSkillFrequency([
      {
        requirements: [
          { skill: "React", importance: "must_have" },
          { skill: "React", importance: "preferred" },
        ],
      },
    ]);
    const react = agg.skills.find((s) => s.skill === "React");
    expect(react?.total).toBe(1);
    expect(react?.shareOfJobs).toBe(1);
  });

  it("handles the empty case without crashing", () => {
    const agg = aggregateSkillFrequency([]);
    expect(agg.jobsAnalysed).toBe(0);
    expect(agg.skills).toEqual([]);
  });
});
