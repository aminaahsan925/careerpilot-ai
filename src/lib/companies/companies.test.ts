import { describe, expect, it } from "vitest";

import { FEATURED_COMPANIES } from "@/data/company-truth";
import {
  COMPANY_DATASET_VERSION,
  companyIdentity,
  isDuplicateCompany,
  normalizeCompanyName,
  normalizeDomain,
} from "./normalization";
import {
  COMPANY_CACHE_KEY_PREFIX,
  assertNotCompanyKeyForUserCache,
  companyResearchCacheKey,
  isCompanyResearchCacheKey,
} from "./cache";
import { extractRoles, aggregateRequirementFrequency } from "./research";
import {
  SEED_SOURCE_LABEL,
  seedCompany,
  seedCompanyBundle,
  seedRequirements,
  seedSnapshot,
  sourceReviewDroppedFields,
} from "./seed";

/* ------------------------------------------------------------------ */
/* Normalization / dedup                                                */
/* ------------------------------------------------------------------ */

describe("normalizeCompanyName", () => {
  it("lowercases and strips legal-entity suffixes", () => {
    expect(normalizeCompanyName("Systems Limited")).toBe("systems");
    expect(normalizeCompanyName("systems limited.")).toBe("systems");
    expect(normalizeCompanyName("NetSol Technologies")).toBe("netsol");
    expect(normalizeCompanyName("  Arbisoft Pvt Ltd  ")).toBe("arbisoft");
  });

  it("collapses punctuation and whitespace", () => {
    expect(normalizeCompanyName("Motive (KeepTruckin)")).toBe(
      "motive keeptruckin",
    );
    expect(normalizeCompanyName("10Pearls")).toBe("10pearls");
  });
});

describe("normalizeDomain", () => {
  it("strips protocol, www, path, and query", () => {
    expect(normalizeDomain("https://www.systemsltd.com/careers?x=1")).toBe(
      "systemsltd.com",
    );
    expect(normalizeDomain("HTTP://Netsoltech.COM/")).toBe("netsoltech.com");
  });

  it("returns null for empty input", () => {
    expect(normalizeDomain(null)).toBeNull();
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
  });
});

describe("companyIdentity + isDuplicateCompany", () => {
  it("builds the (normalized_name, domain) dedup pair", () => {
    expect(
      companyIdentity("Systems Limited", "https://www.systemsltd.com/"),
    ).toEqual({
      normalizedName: "systems",
      domain: "systemsltd.com",
    });
  });

  it("treats same name + same domain as duplicates", () => {
    const a = companyIdentity("Systems Limited", "systemsltd.com");
    const b = companyIdentity(
      "systems limited.",
      "https://systemsltd.com/careers",
    );
    expect(isDuplicateCompany(a, b)).toBe(true);
  });

  it("treats same name with different domains as different companies", () => {
    const a = companyIdentity("Systems", "systemsltd.com");
    const b = companyIdentity("Systems", "systems-other.com");
    expect(isDuplicateCompany(a, b)).toBe(false);
  });

  it("does not merge when only one side has a domain", () => {
    const a = companyIdentity("Arbisoft", "arbisoft.com");
    const b = companyIdentity("Arbisoft", null);
    expect(isDuplicateCompany(a, b)).toBe(false);
  });

  it("treats different names as different companies", () => {
    const a = companyIdentity("NetSol Technologies", "netsoltech.com");
    const b = companyIdentity("Systems Limited", "systemsltd.com");
    expect(isDuplicateCompany(a, b)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Cache-key separation (company vs candidate)                          */
/* ------------------------------------------------------------------ */

describe("companyResearchCacheKey", () => {
  it("is stable for name variants that normalize identically", () => {
    expect(companyResearchCacheKey("Systems Limited", "systemsltd.com")).toBe(
      companyResearchCacheKey(
        "systems limited.",
        "https://systemsltd.com/careers",
      ),
    );
  });

  it("separates companies that differ only by domain", () => {
    expect(companyResearchCacheKey("Systems", "a.com")).not.toBe(
      companyResearchCacheKey("Systems", "b.com"),
    );
  });

  it("embeds the dataset version so format bumps invalidate old entries", () => {
    const key = companyResearchCacheKey("Arbisoft", null);
    expect(key).toContain(COMPANY_DATASET_VERSION);
    expect(key).toContain(COMPANY_CACHE_KEY_PREFIX);
  });

  it("is recognized by the company-key guard and rejected for user caches", () => {
    const key = companyResearchCacheKey("Arbisoft", null);
    expect(isCompanyResearchCacheKey(key)).toBe(true);
    expect(() => assertNotCompanyKeyForUserCache(key)).toThrow(
      /must not be used with per-user candidate caches/,
    );
  });

  it("does not collide with user-scoped candidate cache keys", () => {
    // Candidate caches are keyed by user_id (e.g. market_reality_cache rows);
    // company keys never contain a user id and always carry the prefix.
    const candidateStyleKey = "user_12345:market_reality:v1:global";
    expect(isCompanyResearchCacheKey(candidateStyleKey)).toBe(false);
    expect(() =>
      assertNotCompanyKeyForUserCache(candidateStyleKey),
    ).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Seed source review — no invented statistics                          */
/* ------------------------------------------------------------------ */

describe("seed source review", () => {
  it("drops screeningFilterRate values from every seeded snapshot", () => {
    for (const company of FEATURED_COMPANIES) {
      const snapshot = seedSnapshot(company);
      // The review note legitimately names the dropped field; the
      // invented percentage VALUES must be gone.
      const withoutNote = { ...snapshot, sourceReviewNote: "" };
      expect(JSON.stringify(withoutNote)).not.toMatch(
        /\d{2,3}%\s*(rejected|filtered)/,
      );
      expect(withoutNote).not.toHaveProperty("screeningFilterRate");
    }
  });

  it("marks every seeded claim unverified with a source label", () => {
    for (const company of FEATURED_COMPANIES) {
      const bundle = seedCompanyBundle(company);
      expect(bundle.company.verification).toBe("unverified");
      expect(bundle.snapshot.verification).toBe("unverified");
      expect(bundle.company.sourceLabel).toBe(SEED_SOURCE_LABEL);
      expect(bundle.snapshot.sourceReviewNote).toContain("screeningFilterRate");
    }
  });

  it("documents which fields source review dropped", () => {
    expect(sourceReviewDroppedFields().join(" ")).toContain(
      "screeningFilterRate",
    );
  });

  it("derives requirement rows only from dataset-listed skills", () => {
    const company = FEATURED_COMPANIES[0]!;
    const reqs = seedRequirements(company);
    expect(reqs.length).toBeGreaterThan(0);
    for (const r of reqs) {
      expect(r.source).toBe("seed");
      expect(r.frequencyCount).toBe(1); // real mention count, not a stat
      expect(["must_have", "preferred"]).toContain(r.importance);
    }
    // Crucial non-negotiables become must_have.
    const mustHave = reqs
      .filter((r) => r.importance === "must_have")
      .map((r) => r.skillName);
    expect(mustHave.length).toBeGreaterThan(0);
  });

  it("seedCompany keeps careersUrl null when the dataset has none", () => {
    const company = FEATURED_COMPANIES[0]!;
    expect(seedCompany(company).careersUrl).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Careers-page parsing edge cases                                      */
/* ------------------------------------------------------------------ */

describe("extractRoles", () => {
  it("keeps role-like titles and drops the rest", () => {
    const roles = extractRoles([
      {
        title: "Senior Software Engineer — Systems Limited Careers",
        url: "https://a.com/1",
      },
      { title: "Life at Systems Limited", url: "https://a.com/2" },
      { title: "Privacy Policy", url: "https://a.com/3" },
      { title: "Frontend Developer (React)", url: "https://a.com/4" },
    ]);
    expect(roles.map((r) => r.url)).toEqual([
      "https://a.com/1",
      "https://a.com/4",
    ]);
  });

  it("dedupes by URL and respects the limit", () => {
    const results = Array.from({ length: 5 }, (_, i) => ({
      title: `Software Engineer ${i}`,
      url: "https://a.com/same",
    }));
    expect(extractRoles(results, 2)).toHaveLength(1);
  });

  it("returns an empty list for empty input", () => {
    expect(extractRoles([])).toEqual([]);
  });
});

describe("aggregateRequirementFrequency", () => {
  it("counts each skill once per posting and sorts by frequency", () => {
    const postings = [
      "We need React, TypeScript and PostgreSQL. React experience required.",
      "Looking for a TypeScript developer with PostgreSQL knowledge.",
      "Python and Docker role.",
    ];
    const freq = aggregateRequirementFrequency(postings);
    const byName = new Map(freq.map((f) => [f.skillName, f]));
    // React mentioned twice in posting 1 still counts once there.
    expect(byName.get("React")?.frequencyCount).toBe(1);
    expect(byName.get("TypeScript")?.frequencyCount).toBe(2);
    expect(byName.get("PostgreSQL")?.frequencyCount).toBe(2);
    expect(byName.get("Python")?.frequencyCount).toBe(1);
    // Sorted most-frequent first.
    expect(freq[0]!.frequencyCount).toBeGreaterThanOrEqual(
      freq[1]!.frequencyCount,
    );
  });

  it("computes shareOfPostings as a real ratio", () => {
    const freq = aggregateRequirementFrequency([
      "React role",
      "React role",
      "Python role",
      "Go role",
    ]);
    const react = freq.find((f) => f.skillName === "React")!;
    expect(react.shareOfPostings).toBeCloseTo(0.5);
  });

  it("ignores unknown phrases instead of inventing skills", () => {
    const freq = aggregateRequirementFrequency([
      "We need a quantum blockchain ninja",
    ]);
    expect(freq).toEqual([]);
  });

  it("handles empty input without dividing by zero", () => {
    expect(aggregateRequirementFrequency([])).toEqual([]);
  });
});
