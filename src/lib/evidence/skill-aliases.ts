/**
 * Canonical skill taxonomy for the evidence layer (Phase A6).
 *
 * "Postgres", "PostgreSQL" and "postgresql" must never become three unrelated
 * skills. Every skill string in the system is normalized through
 * normalizeSkill() before it is stored or compared.
 *
 * The same map is seeded into the `skill_aliases` table (migration
 * 20261002000002) so curators can fix aliases without a deploy; this module
 * is the application-side fallback and the single source of truth for
 * categories.
 */

export type SkillCategory =
  | "language"
  | "framework"
  | "database"
  | "cloud"
  | "devops"
  | "testing"
  | "architecture"
  | "ai"
  | "data"
  | "frontend"
  | "backend"
  | "mobile"
  | "soft_skill"
  | "other";

export interface NormalizedSkill {
  /** Canonical display name, e.g. "PostgreSQL". */
  canonical: string;
  category: SkillCategory;
  /** True when the input matched a known alias (vs. best-effort fallback). */
  known: boolean;
}

interface AliasEntry {
  canonical: string;
  category: SkillCategory;
}

/** Keys are normalized with normalizeKey(). */
const ALIASES: Record<string, AliasEntry> = {
  postgresql: { canonical: "PostgreSQL", category: "database" },
  postgres: { canonical: "PostgreSQL", category: "database" },
  mysql: { canonical: "MySQL", category: "database" },
  mongodb: { canonical: "MongoDB", category: "database" },
  mongo: { canonical: "MongoDB", category: "database" },
  redis: { canonical: "Redis", category: "database" },
  sqlite: { canonical: "SQLite", category: "database" },
  elasticsearch: { canonical: "Elasticsearch", category: "database" },
  react: { canonical: "React", category: "frontend" },
  reactjs: { canonical: "React", category: "frontend" },
  nextjs: { canonical: "Next.js", category: "frontend" },
  next: { canonical: "Next.js", category: "frontend" },
  vue: { canonical: "Vue.js", category: "frontend" },
  vuejs: { canonical: "Vue.js", category: "frontend" },
  angular: { canonical: "Angular", category: "frontend" },
  angularjs: { canonical: "Angular", category: "frontend" },
  svelte: { canonical: "Svelte", category: "frontend" },
  html: { canonical: "HTML", category: "frontend" },
  css: { canonical: "CSS", category: "frontend" },
  tailwind: { canonical: "Tailwind CSS", category: "frontend" },
  tailwindcss: { canonical: "Tailwind CSS", category: "frontend" },
  figma: { canonical: "Figma", category: "frontend" },
  typescript: { canonical: "TypeScript", category: "language" },
  ts: { canonical: "TypeScript", category: "language" },
  javascript: { canonical: "JavaScript", category: "language" },
  js: { canonical: "JavaScript", category: "language" },
  python: { canonical: "Python", category: "language" },
  java: { canonical: "Java", category: "language" },
  csharp: { canonical: "C#", category: "language" },
  c: { canonical: "C", category: "language" },
  cpp: { canonical: "C++", category: "language" },
  go: { canonical: "Go", category: "language" },
  golang: { canonical: "Go", category: "language" },
  rust: { canonical: "Rust", category: "language" },
  php: { canonical: "PHP", category: "language" },
  ruby: { canonical: "Ruby", category: "language" },
  kotlin: { canonical: "Kotlin", category: "mobile" },
  swift: { canonical: "Swift", category: "mobile" },
  flutter: { canonical: "Flutter", category: "mobile" },
  reactnative: { canonical: "React Native", category: "mobile" },
  nodejs: { canonical: "Node.js", category: "backend" },
  node: { canonical: "Node.js", category: "backend" },
  express: { canonical: "Express", category: "backend" },
  expressjs: { canonical: "Express", category: "backend" },
  django: { canonical: "Django", category: "backend" },
  flask: { canonical: "Flask", category: "backend" },
  fastapi: { canonical: "FastAPI", category: "backend" },
  spring: { canonical: "Spring Boot", category: "backend" },
  springboot: { canonical: "Spring Boot", category: "backend" },
  graphql: { canonical: "GraphQL", category: "backend" },
  rest: { canonical: "REST APIs", category: "backend" },
  restapi: { canonical: "REST APIs", category: "backend" },
  restapis: { canonical: "REST APIs", category: "backend" },
  docker: { canonical: "Docker", category: "devops" },
  kubernetes: { canonical: "Kubernetes", category: "devops" },
  k8s: { canonical: "Kubernetes", category: "devops" },
  jenkins: { canonical: "Jenkins", category: "devops" },
  githubactions: { canonical: "GitHub Actions", category: "devops" },
  cicd: { canonical: "CI/CD", category: "devops" },
  terraform: { canonical: "Terraform", category: "devops" },
  git: { canonical: "Git", category: "devops" },
  linux: { canonical: "Linux", category: "devops" },
  aws: { canonical: "AWS", category: "cloud" },
  amazonwebservices: { canonical: "AWS", category: "cloud" },
  gcp: { canonical: "GCP", category: "cloud" },
  googlecloud: { canonical: "GCP", category: "cloud" },
  azure: { canonical: "Azure", category: "cloud" },
  vercel: { canonical: "Vercel", category: "cloud" },
  jest: { canonical: "Jest", category: "testing" },
  pytest: { canonical: "pytest", category: "testing" },
  cypress: { canonical: "Cypress", category: "testing" },
  playwright: { canonical: "Playwright", category: "testing" },
  unittest: { canonical: "Unit Testing", category: "testing" },
  tensorflow: { canonical: "TensorFlow", category: "ai" },
  pytorch: { canonical: "PyTorch", category: "ai" },
  scikitlearn: { canonical: "scikit-learn", category: "ai" },
  sklearn: { canonical: "scikit-learn", category: "ai" },
  pandas: { canonical: "pandas", category: "data" },
  numpy: { canonical: "NumPy", category: "data" },
  sql: { canonical: "SQL", category: "database" },
  systemdesign: { canonical: "System Design", category: "architecture" },
  microservices: { canonical: "Microservices", category: "architecture" },
  dsa: { canonical: "Data Structures & Algorithms", category: "architecture" },
  datastructures: { canonical: "Data Structures & Algorithms", category: "architecture" },
  agile: { canonical: "Agile", category: "soft_skill" },
  communication: { canonical: "Communication", category: "soft_skill" },
  leadership: { canonical: "Leadership", category: "soft_skill" },
  teamwork: { canonical: "Teamwork", category: "soft_skill" },
  problemsolving: { canonical: "Problem Solving", category: "soft_skill" },
};

/** Lowercase, strip everything that is not a letter or digit. */
export function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Normalize a free-text skill to its canonical form.
 * Never throws; unknown skills fall back to a title-cased label so no
 * information is lost, flagged with known: false.
 *
 * NOTE: symbols matter for some languages — "C#", "C++" and "F#" are
 * special-cased before the generic normalization strips non-alphanumerics,
 * otherwise "C#" would collapse to "c" (the C language).
 */
export function normalizeSkill(raw: string): NormalizedSkill {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "c#")
    return { canonical: "C#", category: "language", known: true };
  if (trimmed === "c++")
    return { canonical: "C++", category: "language", known: true };
  if (trimmed === "f#")
    return { canonical: "F#", category: "language", known: true };
  const key = normalizeKey(raw);
  if (!key) return { canonical: "Unknown", category: "other", known: false };
  const hit = ALIASES[key];
  if (hit) return { canonical: hit.canonical, category: hit.category, known: true };
  const fallback = raw
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
  return { canonical: fallback || "Unknown", category: "other", known: false };
}

/** Normalize a list, deduplicating by canonical name. */
export function normalizeSkills(raw: string[]): NormalizedSkill[] {
  const seen = new Set<string>();
  const out: NormalizedSkill[] = [];
  for (const r of raw) {
    const n = normalizeSkill(r);
    if (seen.has(n.canonical)) continue;
    seen.add(n.canonical);
    out.push(n);
  }
  return out;
}

/** All canonical skill names in the taxonomy (for UIs / validation). */
export function knownSkills(): { canonical: string; category: SkillCategory }[] {
  const seen = new Map<string, SkillCategory>();
  for (const e of Object.values(ALIASES)) seen.set(e.canonical, e.category);
  return [...seen.entries()].map(([canonical, category]) => ({ canonical, category }));
}
