import { describe, expect, it } from "vitest";

import { knownSkills, normalizeSkill, normalizeSkills } from "./skill-aliases";

describe("normalizeSkill", () => {
  it("maps common aliases to canonical names", () => {
    expect(normalizeSkill("Postgres").canonical).toBe("PostgreSQL");
    expect(normalizeSkill("postgresql").canonical).toBe("PostgreSQL");
    expect(normalizeSkill("reactjs").canonical).toBe("React");
    expect(normalizeSkill("Node.js").canonical).toBe("Node.js");
    expect(normalizeSkill("K8S").canonical).toBe("Kubernetes");
    expect(normalizeSkill("C#").canonical).toBe("C#");
  });

  it("flags known vs unknown skills", () => {
    expect(normalizeSkill("Docker").known).toBe(true);
    expect(normalizeSkill("CobolXyz").known).toBe(false);
  });

  it("assigns categories", () => {
    expect(normalizeSkill("Docker").category).toBe("devops");
    expect(normalizeSkill("Postgres").category).toBe("database");
    expect(normalizeSkill("React").category).toBe("frontend");
  });

  it("never throws on junk input", () => {
    expect(normalizeSkill("").canonical).toBe("Unknown");
    expect(normalizeSkill("   ").canonical).toBe("Unknown");
  });

  it("deduplicates normalized lists", () => {
    expect(normalizeSkills(["react", "ReactJS", "react "])).toHaveLength(1);
  });

  it("exposes a non-empty taxonomy", () => {
    expect(knownSkills().length).toBeGreaterThan(50);
  });
});
