/**
 * Source-aware chunking for the evidence retrieval layer (Phase A7).
 *
 * Never naively slice text into equal character windows. Each source type
 * gets section detection first (resume experience items, job requirement
 * blocks, ...), then long sections are split on sentence boundaries with
 * overlap. Every chunk carries its section label so retrieval can cite
 * provenance ("resume → experience", "job → must-have requirements").
 */
import { createHash } from "node:crypto";

export interface EvidenceChunkInput {
  content: string;
  /** Source-aware section label, e.g. "experience", "requirements_must_have". */
  section: string;
  chunkIndex: number;
  contentHash: string;
}

/** ~500 tokens; overlap keeps split sentences recoverable. */
const TARGET_CHARS = 2000;
const OVERLAP_CHARS = 200;
const MIN_CHUNK_CHARS = 120;

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** Split text into sentences (pragmatic, no NLP dependency). */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(\[])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Sliding window over sentences with character overlap. */
export function chunkGeneric(content: string, section: string): EvidenceChunkInput[] {
  const text = content.trim();
  if (!text) return [];
  if (text.length <= TARGET_CHARS) return [makeChunk(text, section, 0)];

  const sentences = splitSentences(text);
  const chunks: EvidenceChunkInput[] = [];
  let current = "";
  let index = 0;

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed.length >= MIN_CHUNK_CHARS) {
      chunks.push(makeChunk(trimmed, section, index++));
    }
    // Overlap: keep the tail of the flushed chunk as the head of the next.
    current = trimmed.slice(-OVERLAP_CHARS);
  };

  for (const s of sentences) {
    if ((current + " " + s).length > TARGET_CHARS && current.trim().length >= MIN_CHUNK_CHARS) {
      flush();
    }
    current += (current ? " " : "") + s;
  }
  const tail = current.trim();
  if (tail.length >= MIN_CHUNK_CHARS) {
    // Avoid a near-duplicate tail when overlap already covers it.
    const last = chunks[chunks.length - 1];
    if (!last || tail !== last.content) chunks.push(makeChunk(tail, section, index));
  }
  return chunks;
}

function makeChunk(content: string, section: string, chunkIndex: number): EvidenceChunkInput {
  return { content, section, chunkIndex, contentHash: sha256Hex(content) };
}

/** A detected document section before sub-chunking. */
interface Section {
  name: string;
  text: string;
}

const RESUME_HEADERS: [RegExp, string][] = [
  [/^(professional\s+)?summary/i, "summary"],
  [/^objective/i, "summary"],
  [/^(work\s+)?experience|employment(\s+history)?/i, "experience"],
  [/^education/i, "education"],
  [/^(technical\s+)?skills/i, "skills"],
  [/^projects?(\s+\(\w+\))?$/i, "projects"],
  [/^personal\s+projects/i, "projects"],
  [/^certifications?/i, "certifications"],
  [/^achievements?/i, "achievements"],
  [/^publications?/i, "publications"],
];

/**
 * Split a resume into labeled sections. Header detection: a short line that
 * matches a known header pattern (case-insensitive). Unknown prologue text
 * becomes the "summary" section.
 */
export function splitResumeSections(text: string): Section[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let current: Section = { name: "summary", text: "" };

  const push = () => {
    if (current.text.trim()) sections.push(current);
  };

  for (const line of lines) {
    const t = line.trim();
    const header = t.length > 0 && t.length <= 60
      ? RESUME_HEADERS.find(([re]) => re.test(t))
      : undefined;
    if (header) {
      push();
      current = { name: header[1], text: "" };
    } else {
      current.text += line + "\n";
    }
  }
  push();
  return sections.length ? sections : [{ name: "full", text }];
}

/** Chunk a resume: section-aware, then sliding window within long sections. */
export function chunkResumeText(text: string): EvidenceChunkInput[] {
  const out: EvidenceChunkInput[] = [];
  for (const section of splitResumeSections(text)) {
    const sectionLabel = `resume:${section.name}`;
    for (const c of chunkGeneric(section.text, sectionLabel)) {
      out.push({ ...c, chunkIndex: out.length });
    }
  }
  return out;
}

const JOB_HEADERS: [RegExp, string][] = [
  [/^(about|overview|the\s+role|position)/i, "overview"],
  [/responsibilit/i, "responsibilities"],
  [/must.have|required?\s+(skills|qualifications)|what\s+you.ll\s+bring/i, "requirements_must_have"],
  [/preferred|nice.to.have|bonus/i, "requirements_preferred"],
  [/qualifications?/i, "requirements"],
  [/experience/i, "experience"],
  [/tech(nical)?\s+stack|technolog/i, "tech_stack"],
  [/benefits?|compensation|salary/i, "compensation"],
];

/** Chunk a job description with requirement-aware section labels. */
export function chunkJobDescription(text: string): EvidenceChunkInput[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let current: Section = { name: "overview", text: "" };
  const push = () => {
    if (current.text.trim()) sections.push(current);
  };
  for (const line of lines) {
    const t = line.trim();
    const header = t.length > 0 && t.length <= 70
      ? JOB_HEADERS.find(([re]) => re.test(t))
      : undefined;
    if (header) {
      push();
      current = { name: header[1], text: "" };
    } else {
      current.text += line + "\n";
    }
  }
  push();

  const out: EvidenceChunkInput[] = [];
  const list = sections.length ? sections : [{ name: "full", text }];
  for (const section of list) {
    for (const c of chunkGeneric(section.text, `job:${section.name}`)) {
      out.push({ ...c, chunkIndex: out.length });
    }
  }
  return out;
}

/** Chunk project/portfolio text (name + description + technologies). */
export function chunkProjectText(name: string, description: string, technologies: string[]): EvidenceChunkInput[] {
  const text = [
    `Project: ${name}`,
    description?.trim() ? `Description: ${description.trim()}` : "",
    technologies.length ? `Technologies: ${technologies.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return chunkGeneric(text, "project:overview").map((c, i) => ({ ...c, chunkIndex: i }));
}
