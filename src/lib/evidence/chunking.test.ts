import { describe, expect, it } from "vitest";

import {
  chunkGeneric,
  chunkJobDescription,
  chunkProjectText,
  chunkResumeText,
  sha256Hex,
} from "./chunking";

describe("chunkResumeText", () => {
  const resume = [
    "JANE DOE",
    "",
    "SUMMARY",
    "Backend developer with 3 years of experience.",
    "",
    "EXPERIENCE",
    "Acme Corp (2022-2025)",
    "Built REST APIs with Postgres and Redis.",
    "",
    "SKILLS",
    "Python, Postgres, Docker",
  ].join("\n");

  it("detects source-aware sections", () => {
    const chunks = chunkResumeText(resume);
    const sections = new Set(chunks.map((c) => c.section));
    expect(sections.has("resume:summary")).toBe(true);
    expect(sections.has("resume:experience")).toBe(true);
    expect(sections.has("resume:skills")).toBe(true);
  });

  it("attaches content hashes", () => {
    const chunks = chunkResumeText(resume);
    for (const c of chunks) {
      expect(c.contentHash).toHaveLength(64);
      expect(c.contentHash).toBe(sha256Hex(c.content));
    }
  });

  it("returns nothing for empty input", () => {
    expect(chunkResumeText("   ")).toHaveLength(0);
  });
});

describe("chunkJobDescription", () => {
  const jd = [
    "About the role",
    "We are hiring backend engineers.",
    "",
    "Must-have requirements",
    "- PostgreSQL",
    "- Docker",
    "",
    "Nice to have",
    "- Redis",
  ].join("\n");

  it("labels requirement sections", () => {
    const chunks = chunkJobDescription(jd);
    const sections = new Set(chunks.map((c) => c.section));
    expect([...sections].some((s) => s.includes("must_have"))).toBe(true);
    expect([...sections].some((s) => s.includes("preferred"))).toBe(true);
  });
});

describe("chunkGeneric", () => {
  it("splits long text with overlap and size bounds", () => {
    const text = Array(40)
      .fill("This is a sentence with enough content to make chunking meaningful.")
      .join(" ");
    const chunks = chunkGeneric(text, "test");
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(2300);
    }
  });

  it("keeps short text as a single chunk", () => {
    expect(chunkGeneric("Short text.", "test")).toHaveLength(1);
  });
});

describe("chunkProjectText", () => {
  it("combines name, description and technologies", () => {
    const chunks = chunkProjectText("My API", "A REST API.", ["Node.js", "PostgreSQL"]);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.content).toContain("My API");
    expect(chunks[0]?.content).toContain("PostgreSQL");
  });
});
