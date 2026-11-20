/**
 * Hero orbit data: pure helpers for the Round 3 right-side hero
 * composition (Direction 2, Cursor as Flashlight / Lens).
 *
 * Everything here is real data or an honest empty state. Skill counts
 * are title mentions in stored postings, exactly like the Market
 * Mirror's skill strip (MarketLens.tsx). No invented numbers.
 *
 * This file has no React imports on purpose: the helpers are covered
 * by hero-orbit-data.test.ts, which runs in a node environment.
 */

export type HeroOrbitSkill = {
  skill: string;
  /** Stored posting titles naming this skill. */
  count: number;
};

export type HeroOrbitData = {
  /** Top detected skills by title mentions, most mentioned first. */
  skills: HeroOrbitSkill[];
  /** Stored postings the counts are measured against. */
  totalPostings: number;
  /** ISO timestamp of the newest stored posting, or null. */
  newestRetrievedAt: string | null;
  /** Short band label for the resume chip, or null when unanalysed. */
  resumeBand: { label: string; line: string } | null;
  /**
   * ATS format score, or null when unanalysed. Shown only in the lit
   * layer, always with the "format checks, not a hiring chance"
   * disclaimer.
   */
  atsScore: number | null;
  /** First recorded weakness, or null when none measured. */
  topGap: string | null;
  /** Recorded weaknesses in total. */
  gapCount: number;
  hasResume: boolean;
  hasPostings: boolean;
  isLoading: boolean;
};

export const EMPTY_HERO_ORBIT_DATA: HeroOrbitData = {
  skills: [],
  totalPostings: 0,
  newestRetrievedAt: null,
  resumeBand: null,
  atsScore: null,
  topGap: null,
  gapCount: 0,
  hasResume: false,
  hasPostings: false,
  isLoading: false,
};

/** Real count: stored posting titles naming this skill. */
export function titleMentions(skill: string, titles: string[]): number {
  const needle = skill.toLowerCase();
  if (!needle) return 0;
  return titles.filter((title) => title.toLowerCase().includes(needle)).length;
}

/**
 * Top skills by title mentions, most mentioned first. Ties break
 * alphabetically so the order is deterministic. Skills are deduped
 * case-insensitively, keeping the first casing seen.
 */
export function topSkillsByMentions(
  skills: string[],
  titles: string[],
  limit = 6,
): HeroOrbitSkill[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const skill of skills) {
    const name = skill.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  return unique
    .map((skill) => ({ skill, count: titleMentions(skill, titles) }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
    .slice(0, Math.max(0, limit));
}

/**
 * Short band label for the resume chip.
 *
 * Thresholds mirror resume.tsx (bandForAts): 80+ clean, 65+ solid,
 * below that room to grow. Keep in sync with that file: the band is a
 * product rule, and the two copies must not drift apart.
 */
export function bandLabel(ats: number): { label: string; line: string } {
  if (ats >= 80) return { label: "Reads clean", line: "Strong shape. Keep it sharp." };
  if (ats >= 65) return { label: "Solid shape", line: "A few fixes will lift it higher." };
  return { label: "Room to grow", line: "Every fix is listed on your resume page." };
}
