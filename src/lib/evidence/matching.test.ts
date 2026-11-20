import { describe, expect, it } from "vitest";

import {
  classifyRequirement,
  computeCoverage,
  type EvidenceInput,
} from "./matching";

const EV: EvidenceInput[] = [
  { id: "e1", skill_key: "PostgreSQL", evidence_strength: 3, confidence: 0.9, verification_status: "verified", source_type: "project" },
  { id: "e2", skill_key: "Docker", evidence_strength: 2, confidence: 0.7, verification_status: "extracted", source_type: "project" },
  { id: "e3", skill_key: "Redis", evidence_strength: 1, confidence: 0.6, verification_status: "extracted", source_type: "resume" },
  { id: "e4", skill_key: "Kubernetes", evidence_strength: 0, confidence: 0.4, verification_status: "extracted", source_type: "manual_claim" },
];

describe("classifyRequirement", () => {
  it("normalizes skill names before matching", () => {
    expect(classifyRequirement({ skill: "Postgres", importance: "must_have" }, EV).level).toBe("PROVEN");
    expect(classifyRequirement({ skill: "postgres", importance: "must_have" }, EV).level).toBe("PROVEN");
  });

  it("classifies all six levels", () => {
    expect(classifyRequirement({ skill: "PostgreSQL", importance: "must_have" }, EV).level).toBe("PROVEN");
    expect(classifyRequirement({ skill: "Docker", importance: "must_have" }, EV).level).toBe("PARTIALLY_PROVEN");
    expect(classifyRequirement({ skill: "Redis", importance: "preferred" }, EV).level).toBe("WEAK_EVIDENCE");
    expect(classifyRequirement({ skill: "Kubernetes", importance: "preferred" }, EV).level).toBe("CLAIMED_ONLY");
    expect(classifyRequirement({ skill: "AWS", importance: "must_have" }, EV).level).toBe("MISSING");
    const lowConf: EvidenceInput[] = [
      { id: "e9", skill_key: "Go", evidence_strength: 1, confidence: 0.2, verification_status: "extracted", source_type: "resume" },
    ];
    expect(classifyRequirement({ skill: "Go", importance: "preferred" }, lowConf).level).toBe("UNCLEAR");
  });

  it("always returns a reason and evidence ids", () => {
    const c = classifyRequirement({ skill: "Docker", importance: "must_have" }, EV);
    expect(c.reason.length).toBeGreaterThan(0);
    expect(c.evidenceIds).toContain("e2");
  });
});

describe("computeCoverage", () => {
  it("computes deterministic weighted coverage", () => {
    const cov = computeCoverage(
      [
        { skill: "PostgreSQL", importance: "must_have" },
        { skill: "Docker", importance: "must_have" },
        { skill: "Redis", importance: "preferred" },
        { skill: "AWS", importance: "must_have" },
      ],
      EV,
    );
    // (1*2 + 0.6*2 + 0.3*1 + 0*2) / (2+2+1+2) = 3.5/7 = 50
    expect(cov.coveragePct).toBe(50);
    expect(cov.mustHave).toEqual({ total: 3, proven: 1, partial: 1 });
    expect(cov.criticalGaps).toHaveLength(1);
    expect(cov.criticalGaps[0]?.skill).toBe("AWS");
  });

  it("handles empty requirements", () => {
    const cov = computeCoverage([], EV);
    expect(cov.coveragePct).toBe(0);
    expect(cov.total).toBe(0);
  });
});
