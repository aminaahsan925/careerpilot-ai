import { describe, expect, it } from "vitest";

import {
  bandLabel,
  titleMentions,
  topSkillsByMentions,
} from "./hero-orbit-data";

describe("titleMentions", () => {
  const titles = [
    "Senior Python Engineer",
    "python developer",
    "Frontend Engineer (React)",
    "Data Analyst",
    "React Native Engineer",
  ];

  it("counts case-insensitive substring matches", () => {
    expect(titleMentions("Python", titles)).toBe(2);
    expect(titleMentions("react", titles)).toBe(2);
    expect(titleMentions("Data", titles)).toBe(1);
  });

  it("returns 0 for a skill no title names", () => {
    expect(titleMentions("Go", titles)).toBe(0);
  });

  it("returns 0 for an empty skill or no titles", () => {
    expect(titleMentions("", titles)).toBe(0);
    expect(titleMentions("Python", [])).toBe(0);
  });
});

describe("topSkillsByMentions", () => {
  const titles = [
    "Python Engineer",
    "Python Engineer",
    "React Developer",
    "SQL Analyst",
    "React Developer",
    "Python Engineer",
  ];

  it("orders by count desc and caps at the limit", () => {
    const top = topSkillsByMentions(["React", "Python", "SQL", "Docker"], titles, 3);
    expect(top).toEqual([
      { skill: "Python", count: 3 },
      { skill: "React", count: 2 },
      { skill: "SQL", count: 1 },
    ]);
  });

  it("breaks ties alphabetically so the order is deterministic", () => {
    const top = topSkillsByMentions(["Zebra", "Apple", "Mango"], ["Apple Pie", "Mango Salad"]);
    expect(top.map((s) => s.skill)).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("dedupes case-insensitively, keeping the first casing", () => {
    const top = topSkillsByMentions(["python", "Python", "PYTHON"], titles);
    expect(top).toEqual([{ skill: "python", count: 3 }]);
  });

  it("keeps zero-count skills (they are real, just unmentioned)", () => {
    const top = topSkillsByMentions(["Docker"], titles);
    expect(top).toEqual([{ skill: "Docker", count: 0 }]);
  });

  it("skips blank skill names", () => {
    const top = topSkillsByMentions(["  ", "Python"], titles);
    expect(top).toEqual([{ skill: "Python", count: 3 }]);
  });
});

describe("bandLabel", () => {
  it("matches the resume page thresholds: 80+ clean, 65+ solid, else room to grow", () => {
    expect(bandLabel(100).label).toBe("Reads clean");
    expect(bandLabel(80).label).toBe("Reads clean");
    expect(bandLabel(79).label).toBe("Solid shape");
    expect(bandLabel(65).label).toBe("Solid shape");
    expect(bandLabel(64).label).toBe("Room to grow");
    expect(bandLabel(0).label).toBe("Room to grow");
  });
});
