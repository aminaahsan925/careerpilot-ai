/**
 * Phase 5 job intelligence tests.
 *
 * Covers: deterministic candidate-vs-job gap + snapshot caching,
 * requirement-hash invalidation, cache-identity separation from the
 * shared company cache, URL validation rules (official-domain
 * preference, broken-link detection against a local HTTP server),
 * requirement frequency from stored rows, and three-way comparison
 * assembly (including the no-invented-company-data rule).
 */
import { createServer, type Server } from "node:http";
import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { companyResearchCacheKey } from "../companies/cache";
import { computeCoverage } from "../evidence/matching";
import {
  analyzeJobPosting,
  buildThreeWayRows,
  getCompanyPostingFrequency,
  getPostingDeepDive,
  getThreeWayComparison,
  jobSnapshotIdentity,
  requirementsHash,
  validateJobUrl,
} from "./intelligence";
import {
  checkLink,
  classifyLink,
  normalizeUrl,
  preferOfficialUrls,
  urlHash,
} from "./urls";

/* ------------------------------------------------------------------ */
/* Minimal chainable Supabase stub                                      */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;
type Write = { table: string; row: unknown };

function stubDb(seed: Record<string, Row[]>, writes: Write[] = []) {
  const db = {
    from(table: string) {
      const rows = seed[table] ?? [];
      const filters: Array<(r: Row) => boolean> = [];
      let limitN: number | null = null;
      const apply = () => {
        const out = rows.filter((r) => filters.every((f) => f(r)));
        return limitN === null ? out : out.slice(0, limitN);
      };
      const api: Record<string, (...args: never[]) => unknown> = {
        select: () => api,
        eq: (k: string, v: unknown) => {
          filters.push((r) => r[k] === v);
          return api;
        },
        gt: (k: string, v: string) => {
          filters.push((r) => String(r[k]) > v);
          return api;
        },
        in: (k: string, vs: unknown[]) => {
          filters.push((r) => vs.includes(r[k]));
          return api;
        },
        order: () => api,
        limit: (n: number) => {
          limitN = n;
          return api;
        },
        maybeSingle: () =>
          Promise.resolve({ data: apply()[0] ?? null, error: null }),
        upsert: (row: unknown) => {
          writes.push({ table, row });
          return Promise.resolve({ data: null, error: null });
        },
        insert: (row: unknown) => {
          writes.push({ table, row });
          return Promise.resolve({ data: null, error: null });
        },
        // Thenable so `await db.from(t).select().eq()` resolves rows.
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: apply(), error: null }),
      };
      return api;
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db as any;
}

const USER = "user-1";
const JOB = "job-1";
const FUTURE = new Date(Date.now() + 30 * 86400_000).toISOString();

function jobRow(overrides: Row = {}): Row {
  return {
    id: JOB,
    user_id: USER,
    title: "Backend Engineer",
    company: "Systems Limited",
    url: null,
    location_country: "Pakistan",
    location_city: "Lahore",
    remote_type: "onsite",
    published_at: null,
    retrieved_at: new Date().toISOString(),
    expires_at: FUTURE,
    ...overrides,
  };
}

function requirementRow(skill: string, importance: string): Row {
  return { job_id: JOB, user_id: USER, skill, importance, source_text: null };
}

function evidenceRow(skillKey: string, strength: number): Row {
  return {
    id: `ev-${skillKey}`,
    user_id: USER,
    skill_key: skillKey,
    evidence_strength: strength,
    confidence: 0.9,
    verification_status: "verified",
    source_type: "project",
  };
}

/* ------------------------------------------------------------------ */
/* requirementsHash                                                     */
/* ------------------------------------------------------------------ */

describe("requirementsHash", () => {
  it("is order-insensitive", () => {
    const a = [
      { skill: "TypeScript", importance: "must_have" as const },
      { skill: "PostgreSQL", importance: "preferred" as const },
    ];
    const b = [...a].reverse();
    expect(requirementsHash(a)).toBe(requirementsHash(b));
  });

  it("changes when importance changes", () => {
    const a = [{ skill: "TypeScript", importance: "must_have" as const }];
    const b = [{ skill: "TypeScript", importance: "preferred" as const }];
    expect(requirementsHash(a)).not.toBe(requirementsHash(b));
  });

  it("canonicalizes aliases before hashing", () => {
    const a = [{ skill: "postgres", importance: "must_have" as const }];
    const b = [{ skill: "PostgreSQL", importance: "must_have" as const }];
    expect(requirementsHash(a)).toBe(requirementsHash(b));
  });

  it("is stable for empty requirements", () => {
    expect(requirementsHash([])).toBe(requirementsHash([]));
  });
});

/* ------------------------------------------------------------------ */
/* Cache identity separation                                            */
/* ------------------------------------------------------------------ */

describe("jobSnapshotIdentity", () => {
  it("is scoped per user+job", () => {
    expect(jobSnapshotIdentity("u1", "j1")).not.toBe(
      jobSnapshotIdentity("u2", "j1"),
    );
    expect(jobSnapshotIdentity("u1", "j1")).not.toBe(
      jobSnapshotIdentity("u1", "j2"),
    );
    expect(jobSnapshotIdentity("u1", "j1")).toBe(
      jobSnapshotIdentity("u1", "j1"),
    );
  });

  it("can never collide with the shared company cache key", () => {
    // The company cache has no user dimension; a job snapshot always does.
    const companyKey = companyResearchCacheKey("Systems Limited", null);
    expect(companyKey).not.toContain("u1");
    expect(jobSnapshotIdentity("u1", "j1")).not.toBe(companyKey);
    expect(jobSnapshotIdentity("u1", "j1").startsWith("job_snapshot:")).toBe(
      true,
    );
    expect(companyKey.startsWith("company_research:")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* analyzeJobPosting (deterministic gap + snapshot cache)               */
/* ------------------------------------------------------------------ */

describe("analyzeJobPosting", () => {
  const seed = () => ({
    jobs: [jobRow()],
    job_requirements: [
      requirementRow("TypeScript", "must_have"),
      requirementRow("PostgreSQL", "preferred"),
    ],
    evidence_items: [evidenceRow("TypeScript", 3)],
    job_snapshots: [] as Row[],
  });

  it("computes a deterministic gap and persists the snapshot", async () => {
    const writes: Write[] = [];
    const analysis = await analyzeJobPosting(stubDb(seed(), writes), USER, JOB);
    expect(analysis.fromCache).toBe(false);
    expect(analysis.report.coverage.coveragePct).toBeGreaterThan(0);
    const levels = new Map(
      analysis.report.coverage.classifications.map((c) => [c.skill, c.level]),
    );
    expect(levels.get("TypeScript")).toBe("PROVEN");
    expect(levels.get("PostgreSQL")).toBe("MISSING");
    expect(
      analysis.report.coverage.criticalGaps.map((g) => g.skill),
    ).not.toContain("TypeScript");

    const snapshotWrite = writes.find((w) => w.table === "job_snapshots");
    expect(snapshotWrite).toBeDefined();
    const row = snapshotWrite!.row as Row;
    expect(row["user_id"]).toBe(USER);
    expect(row["job_id"]).toBe(JOB);
    expect(row["requirements_hash"]).toBe(analysis.requirementsHash);
  });

  it("returns a fresh snapshot from cache without recomputing", async () => {
    const writes: Write[] = [];
    const first = await analyzeJobPosting(stubDb(seed(), writes), USER, JOB);
    expect(writes.length).toBe(1);

    // Second call: the snapshot row now exists, is fresh, hash matches.
    const snapshotRow: Row = {
      user_id: USER,
      job_id: JOB,
      coverage: (writes[0]!.row as Row)["coverage"],
      requirements_hash: first.requirementsHash,
      expires_at: FUTURE,
      created_at: new Date().toISOString(),
    };
    const db2 = stubDb({ ...seed(), job_snapshots: [snapshotRow] });
    const second = await analyzeJobPosting(db2, USER, JOB);
    expect(second.fromCache).toBe(true);
    expect(second.report.coverage.coveragePct).toBe(
      first.report.coverage.coveragePct,
    );
  });

  it("recomputes when the requirements hash no longer matches", async () => {
    const staleRow: Row = {
      user_id: USER,
      job_id: JOB,
      coverage: {
        total: 1,
        mustHave: { total: 1, proven: 0, partial: 0 },
        preferred: { total: 0, proven: 0, partial: 0 },
        coveragePct: 0,
        criticalGaps: [],
        classifications: [],
      },
      requirements_hash: "stale-hash",
      expires_at: FUTURE,
      created_at: new Date().toISOString(),
    };
    const writes: Write[] = [];
    const analysis = await analyzeJobPosting(
      stubDb({ ...seed(), job_snapshots: [staleRow] }, writes),
      USER,
      JOB,
    );
    expect(analysis.fromCache).toBe(false);
    expect(analysis.requirementsHash).not.toBe("stale-hash");
    expect(writes.length).toBe(1); // snapshot rewritten
  });

  it("throws for a job the user does not have", async () => {
    await expect(
      analyzeJobPosting(stubDb(seed()), USER, "missing-job"),
    ).rejects.toThrow("saved jobs");
  });

  it("still returns the analysis when the snapshot table is missing", async () => {
    // Migration not applied: snapshot read/write reject.
    const failing = {
      from() {
        const api: Record<string, (...args: never[]) => unknown> = {
          select: () => api,
          eq: () => api,
          gt: () => api,
          in: () => api,
          order: () => api,
          limit: () => api,
          maybeSingle: () => Promise.reject(new Error("relation missing")),
          upsert: () => Promise.reject(new Error("relation missing")),
          then: (resolve: (v: unknown) => void) =>
            resolve({ data: [], error: null }),
        };
        return api;
      },
    };
    // Jobs/requirements/evidence still load via the seed tables.
    const db = stubDb(seed());
    const dbWithFailingSnapshots = {
      from(table: string) {
        if (table === "job_snapshots") return failing.from();
        return db.from(table);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const analysis = await analyzeJobPosting(dbWithFailingSnapshots, USER, JOB);
    expect(analysis.fromCache).toBe(false);
    expect(analysis.report.coverage.total).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/* buildThreeWayRows                                                     */
/* ------------------------------------------------------------------ */

describe("buildThreeWayRows", () => {
  it("unions posting and company skills with candidate levels", () => {
    const coverage = computeCoverage(
      [
        { skill: "TypeScript", importance: "must_have" },
        { skill: "PostgreSQL", importance: "preferred" },
      ],
      [
        {
          id: "e1",
          skill_key: "TypeScript",
          evidence_strength: 3,
          confidence: 0.9,
          verification_status: "verified",
          source_type: "project",
        },
      ],
    );
    const rows = buildThreeWayRows(
      [
        { skill: "TypeScript", importance: "must_have" },
        { skill: "PostgreSQL", importance: "preferred" },
      ],
      [
        { skill: "TypeScript", importance: "preferred" },
        { skill: "Docker", importance: "must_have" },
      ],
      coverage,
    );
    const bySkill = new Map(rows.map((r) => [r.skill, r]));
    expect(bySkill.get("TypeScript")?.postingImportance).toBe("must_have");
    expect(bySkill.get("TypeScript")?.companyImportance).toBe("preferred");
    expect(bySkill.get("TypeScript")?.candidateLevel).toBe("PROVEN");
    expect(bySkill.get("PostgreSQL")?.candidateLevel).toBe("MISSING");
    // Company-only skill still appears, with no posting importance.
    expect(bySkill.get("Docker")?.postingImportance).toBeNull();
    expect(bySkill.get("Docker")?.companyImportance).toBe("must_have");
    expect(bySkill.get("Docker")?.candidateLevel).toBe("MISSING");
  });

  it("lets must_have win when a company lists a skill twice", () => {
    const coverage = computeCoverage([], []);
    const rows = buildThreeWayRows(
      [],
      [
        { skill: "Docker", importance: "preferred" },
        { skill: "docker", importance: "must_have" },
      ],
      coverage,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.companyImportance).toBe("must_have");
  });
});

/* ------------------------------------------------------------------ */
/* URL validation rules                                                 */
/* ------------------------------------------------------------------ */

describe("normalizeUrl", () => {
  it("strips tracking params, hash, and case", () => {
    expect(
      normalizeUrl(
        "https://Example.com/careers/job?utm_source=x&fbclid=abc#apply",
      ),
    ).toBe("https://example.com/careers/job");
  });

  it("keeps meaningful query params", () => {
    expect(normalizeUrl("https://example.com/jobs?id=123")).toBe(
      "https://example.com/jobs?id=123",
    );
  });

  it("returns null for garbage", () => {
    expect(normalizeUrl("not a url")).toBeNull();
    expect(normalizeUrl("ftp://example.com/x")).toBeNull();
    expect(normalizeUrl(null)).toBeNull();
  });
});

describe("urlHash", () => {
  it("is stable and alias-insensitive to tracking params", () => {
    const a = urlHash("https://example.com/job?utm_source=x");
    const b = urlHash("https://example.com/job");
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });
});

describe("classifyLink", () => {
  it("prefers the company's own domain, including subdomains", () => {
    expect(
      classifyLink("https://careers.acme.com/job/1", "acme.com").kind,
    ).toBe("official");
    expect(classifyLink("https://www.acme.com/job/1", "acme.com").kind).toBe(
      "official",
    );
  });

  it("flags known aggregators", () => {
    expect(
      classifyLink("https://www.linkedin.com/jobs/123", "acme.com").kind,
    ).toBe("aggregator");
    expect(classifyLink("https://rozee.pk/job/1", "acme.com").kind).toBe(
      "aggregator",
    );
  });

  it("is unknown, never guessed, otherwise", () => {
    expect(
      classifyLink("https://randomboard.example.net/x", "acme.com").kind,
    ).toBe("unknown");
    expect(classifyLink("not a url", "acme.com").kind).toBe("unknown");
  });
});

describe("preferOfficialUrls", () => {
  it("orders official first, aggregators last", () => {
    const ordered = preferOfficialUrls(
      [
        "https://www.linkedin.com/jobs/1",
        "https://careers.acme.com/eng",
        "https://jobs.example.org/x",
      ],
      "acme.com",
    );
    expect(ordered[0]).toBe("https://careers.acme.com/eng");
    expect(ordered[2]).toBe("https://www.linkedin.com/jobs/1");
  });
});

describe("checkLink (local HTTP server)", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === "/ok") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("fine");
      } else if (req.url === "/gone") {
        res.writeHead(404);
        res.end();
      } else if (req.url === "/moved") {
        res.writeHead(301, { location: "/ok" });
        res.end();
      } else {
        res.writeHead(500);
        res.end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("marks a 200 link reachable", async () => {
    const result = await checkLink(`${base}/ok`);
    expect(result?.reachable).toBe(true);
    expect(result?.httpStatus).toBe(200);
  });

  it("marks a 404 link unreachable", async () => {
    const result = await checkLink(`${base}/gone`);
    expect(result?.reachable).toBe(false);
    expect(result?.httpStatus).toBe(404);
  });

  it("follows redirects and records the final URL", async () => {
    const result = await checkLink(`${base}/moved`);
    expect(result?.reachable).toBe(true);
    expect(result?.finalUrl).toBe(`${base}/ok`);
  });

  it("marks a refused connection unreachable without throwing", async () => {
    const result = await checkLink("http://127.0.0.1:1/nope", 1500);
    expect(result?.reachable).toBe(false);
    expect(result?.httpStatus).toBeNull();
  });

  it("returns null for unparseable URLs", async () => {
    expect(await checkLink("not a url")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* getCompanyPostingFrequency                                             */
/* ------------------------------------------------------------------ */

describe("getCompanyPostingFrequency", () => {
  it("aggregates real stored rows, matching companies case-insensitively", async () => {
    const db = stubDb({
      jobs: [
        jobRow({ id: "j1", company: "Systems Limited" }),
        jobRow({ id: "j2", company: "systems limited." }),
        jobRow({ id: "j3", company: "Other Corp" }),
      ],
      job_requirements: [
        {
          job_id: "j1",
          user_id: USER,
          skill: "TypeScript",
          importance: "must_have",
          source_text: null,
        },
        {
          job_id: "j1",
          user_id: USER,
          skill: "TypeScript",
          importance: "must_have",
          source_text: null,
        },
        {
          job_id: "j2",
          user_id: USER,
          skill: "TypeScript",
          importance: "preferred",
          source_text: null,
        },
        {
          job_id: "j2",
          user_id: USER,
          skill: "Docker",
          importance: "must_have",
          source_text: null,
        },
        {
          job_id: "j3",
          user_id: USER,
          skill: "Go",
          importance: "must_have",
          source_text: null,
        },
      ],
      job_snapshots: [] as Row[],
      evidence_items: [] as Row[],
    });
    const freq = await getCompanyPostingFrequency(db, USER, "systems limited");
    expect(freq.aggregation.jobsAnalysed).toBe(2);
    const ts = freq.aggregation.skills.find((s) => s.skill === "TypeScript");
    // Counted once per posting even though j1 lists it twice.
    expect(ts?.total).toBe(2);
    expect(ts?.shareOfJobs).toBe(1);
    expect(
      freq.aggregation.skills.find((s) => s.skill === "Go"),
    ).toBeUndefined();
  });

  it("returns an empty aggregation when the company has no postings", async () => {
    const db = stubDb({
      jobs: [jobRow()],
      job_requirements: [],
      job_snapshots: [] as Row[],
      evidence_items: [] as Row[],
    });
    const freq = await getCompanyPostingFrequency(db, USER, "Nobody Inc");
    expect(freq.aggregation.jobsAnalysed).toBe(0);
    expect(freq.aggregation.skills).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* getThreeWayComparison                                                  */
/* ------------------------------------------------------------------ */

describe("getThreeWayComparison", () => {
  const seedDb = () =>
    stubDb({
      jobs: [jobRow()],
      job_requirements: [requirementRow("TypeScript", "must_have")],
      evidence_items: [evidenceRow("TypeScript", 3)],
      job_snapshots: [] as Row[],
      companies: [] as Row[],
      company_requirements: [] as Row[],
      job_link_checks: [] as Row[],
    });

  it("uses the source-reviewed seed for featured companies", async () => {
    const comparison = await getThreeWayComparison(seedDb(), USER, JOB);
    expect(comparison.companySide.provenance).toEqual({
      origin: "seed",
      verification: "unverified",
    });
    expect(comparison.companySide.requirementCount).toBeGreaterThan(0);
    expect(comparison.rows.length).toBeGreaterThan(0);
    expect(comparison.posting.coverage.coveragePct).toBeGreaterThan(0);
  });

  it("never invents company requirements for unknown companies", async () => {
    const db = seedDb();
    const unknownSeed = {
      jobs: [jobRow({ company: "Totally Made Up Startup XYZ" })],
      job_requirements: [requirementRow("TypeScript", "must_have")],
      evidence_items: [evidenceRow("TypeScript", 3)],
      job_snapshots: [] as Row[],
      companies: [] as Row[],
      company_requirements: [] as Row[],
      job_link_checks: [] as Row[],
    };
    const comparison = await getThreeWayComparison(
      stubDb(unknownSeed),
      USER,
      JOB,
    );
    expect(comparison.companySide.provenance).toEqual({ origin: "none" });
    expect(comparison.companySide.requirementCount).toBe(0);
    expect(comparison.companySide.note).toMatch(/research the company/i);
    // The posting side still works.
    expect(comparison.posting.requirementCount).toBe(1);
    void db;
  });
});

/* ------------------------------------------------------------------ */
/* getPostingDeepDive                                                     */
/* ------------------------------------------------------------------ */

describe("getPostingDeepDive", () => {
  it("assembles provenance, requirements, analysis, and link status", async () => {
    const db = stubDb({
      jobs: [jobRow({ url: null, published_at: "2026-09-01T00:00:00Z" })],
      job_requirements: [requirementRow("TypeScript", "must_have")],
      evidence_items: [evidenceRow("TypeScript", 3)],
      job_snapshots: [] as Row[],
      companies: [] as Row[],
      company_requirements: [] as Row[],
      job_link_checks: [] as Row[],
    });
    const deepDive = await getPostingDeepDive(db, USER, JOB);
    expect(deepDive.provenance.publishedAt).toBe("2026-09-01T00:00:00Z");
    expect(deepDive.requirements).toHaveLength(1);
    expect(deepDive.analysis.report.coverage.total).toBe(1);
    // No URL on the posting: link stays unknown, never throws.
    expect(deepDive.link.kind).toBe("unknown");
    expect(deepDive.link.reachable).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* validateJobUrl                                                         */
/* ------------------------------------------------------------------ */

describe("validateJobUrl", () => {
  it("returns unknown for a posting without a URL", async () => {
    const db = stubDb({
      jobs: [jobRow({ url: null })],
      job_requirements: [],
      job_snapshots: [] as Row[],
      companies: [] as Row[],
      company_requirements: [] as Row[],
      job_link_checks: [] as Row[],
    });
    const validation = await validateJobUrl(db, USER, JOB);
    expect(validation.url).toBeNull();
    expect(validation.reachable).toBeNull();
  });

  it("serves a fresh shared-cache verdict without hitting the network", async () => {
    const db = stubDb({
      jobs: [jobRow({ url: "https://careers.example.com/job/9" })],
      job_requirements: [],
      job_snapshots: [] as Row[],
      companies: [] as Row[],
      company_requirements: [] as Row[],
      job_link_checks: [
        {
          url_hash: urlHash("https://careers.example.com/job/9"),
          url: "https://careers.example.com/job/9",
          status: "reachable",
          http_status: 200,
          final_url: null,
          checked_at: new Date().toISOString(),
          expires_at: FUTURE,
        },
      ],
    });
    const validation = await validateJobUrl(db, USER, JOB);
    expect(validation.fromCache).toBe(true);
    expect(validation.reachable).toBe(true);
    expect(validation.httpStatus).toBe(200);
    expect(validation.kind).toBe("unknown"); // no company domain known
  });
});
