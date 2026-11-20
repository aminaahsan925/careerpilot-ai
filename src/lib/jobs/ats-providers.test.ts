import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AtsProviderError,
  AshbyProvider,
  GreenhouseProvider,
  LeverProvider,
  KNOWN_ATS_BOARDS,
  atsBoardApiUrl,
  atsBoardPageUrl,
  createAtsProvider,
  parseAshbyJobs,
  parseGreenhouseJobs,
  parseLeverPostings,
  resolveAtsBoard,
  splitLocationName,
  stripHtml,
} from "./ats-providers";

/* ------------------------------------------------------------------ */
/* Fixtures — shapes copied from the real API responses fetched live   */
/* on 2026-11-20 (GitLab/Greenhouse, Spotify/Lever, Linear/Ashby).     */
/* ------------------------------------------------------------------ */

const GREENHOUSE_FIXTURE = {
  jobs: [
    {
      id: "8638232002",
      title: "Senior Backend Engineer",
      absolute_url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
      location: { name: "Remote, United States" },
      first_published: "2026-07-22T13:38:40-04:00",
      updated_at: "2026-11-06T15:25:07-05:00",
    },
    {
      id: "8638232003",
      title: "Product Designer",
      absolute_url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232003",
      location: { name: "Bangalore, India" },
      first_published: null,
      updated_at: "2026-11-01T10:00:00-05:00",
    },
    {
      id: "bad",
      title: "   ",
      absolute_url: "https://example.com",
      location: { name: "Nowhere" },
    },
  ],
  meta: { total: 2 },
};

const LEVER_FIXTURE = [
  {
    id: "2a55d6c9-c564-443a-be3e-a3851db5a93b",
    text: "Account Executive - Commercial, Spotify Technology",
    hostedUrl: "https://jobs.lever.co/spotify/2a55d6c9",
    applyUrl: "https://jobs.lever.co/spotify/2a55d6c9/apply",
    descriptionPlain: "We help organizations improve how they build software.",
    createdAt: 1792767640768,
    country: "US",
    workplaceType: "hybrid",
    categories: {
      location: "New York, NY",
      team: "Platform",
      department: "Operations",
    },
  },
  {
    id: "remote-1",
    text: "Data Analyst",
    hostedUrl: "https://jobs.lever.co/spotify/remote-1",
    descriptionPlain: null,
    createdAt: null,
    country: "GB",
    workplaceType: "remote",
    categories: { location: "London" },
  },
];

const ASHBY_FIXTURE = {
  jobs: [
    {
      id: "d3bc1ced-3ce4-4086-a050-555055dbb1ff",
      title: "Senior / Staff Fullstack Engineer",
      location: "Europe",
      isRemote: true,
      isListed: true,
      workplaceType: "Remote",
      publishedAt: "2021-04-27T20:13:45.158+00:00",
      jobUrl: "https://jobs.ashbyhq.com/linear/d3bc1ced",
      applyUrl: "https://jobs.ashbyhq.com/linear/d3bc1ced/application",
      descriptionHtml: "<p>Build <strong>great</strong> software.</p>",
      address: { postalAddress: { addressCountry: "European Union" } },
    },
    {
      id: "unlisted-1",
      title: "Hidden Role",
      location: "Europe",
      isRemote: false,
      isListed: false,
      workplaceType: "Hybrid",
      publishedAt: "2021-04-27T20:13:45.158+00:00",
      jobUrl: "https://jobs.ashbyhq.com/linear/unlisted-1",
      descriptionHtml: null,
      address: null,
    },
  ],
  apiVersion: "1.0",
};

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

describe("stripHtml", () => {
  it("strips tags and decodes entities", () => {
    expect(stripHtml("<p>Hello <strong>world</strong> &amp; friends</p>")).toBe(
      "Hello world & friends",
    );
  });

  it("returns null for empty or tag-only input", () => {
    expect(stripHtml(null)).toBeNull();
    expect(stripHtml("")).toBeNull();
    expect(stripHtml("<br/>")).toBeNull();
  });
});

describe("splitLocationName", () => {
  it("splits city + country", () => {
    expect(splitLocationName("Bangalore, India")).toEqual({
      city: "Bangalore",
      country: "India",
    });
  });

  it("treats a leading work-mode word as no city", () => {
    expect(splitLocationName("Remote, United States")).toEqual({
      city: null,
      country: "United States",
    });
    expect(splitLocationName("Remote")).toEqual({
      city: null,
      country: null,
    });
  });

  it("keeps only the first location of a multi-location string", () => {
    expect(
      splitLocationName("Remote, Canada; Remote, United States"),
    ).toEqual({ city: null, country: "Canada" });
  });

  it("returns nulls for empty input", () => {
    expect(splitLocationName(null)).toEqual({ city: null, country: null });
  });
});

/* ------------------------------------------------------------------ */
/* Parsers                                                             */
/* ------------------------------------------------------------------ */

describe("parseGreenhouseJobs", () => {
  it("normalizes jobs and skips blank titles", () => {
    const postings = parseGreenhouseJobs(GREENHOUSE_FIXTURE, "GitLab");
    expect(postings).toHaveLength(2);
    expect(postings[0]).toMatchObject({
      externalId: "8638232002",
      title: "Senior Backend Engineer",
      company: "GitLab",
      country: "United States",
      city: null,
      remoteType: "remote",
      url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
      // List endpoint carries no description — null, never invented.
      description: null,
      publishedAt: "2026-07-22T13:38:40-04:00",
    });
    expect(postings[1]).toMatchObject({
      city: "Bangalore",
      country: "India",
      remoteType: "unknown",
      // Falls back to updated_at when first_published is null.
      publishedAt: "2026-11-01T10:00:00-05:00",
    });
  });

  it("throws AtsProviderError on an unexpected shape", () => {
    expect(() => parseGreenhouseJobs({ jobs: "nope" }, "X")).toThrow(
      AtsProviderError,
    );
    expect(() => parseGreenhouseJobs([], "X")).toThrow(AtsProviderError);
  });

  it("returns an empty list for a live board with no jobs", () => {
    expect(parseGreenhouseJobs({ jobs: [] }, "X")).toEqual([]);
  });
});

describe("parseLeverPostings", () => {
  it("normalizes postings with ISO country and epoch dates", () => {
    const postings = parseLeverPostings(LEVER_FIXTURE, "Spotify");
    expect(postings).toHaveLength(2);
    expect(postings[0]).toMatchObject({
      title: "Account Executive - Commercial, Spotify Technology",
      company: "Spotify",
      country: "US",
      city: "New York",
      remoteType: "hybrid",
      url: "https://jobs.lever.co/spotify/2a55d6c9",
      publishedAt: new Date(1792767640768).toISOString(),
    });
    expect(postings[1]).toMatchObject({
      country: "GB",
      city: null,
      remoteType: "remote",
      description: null,
      publishedAt: null,
    });
  });

  it("throws AtsProviderError on a non-array payload", () => {
    expect(() => parseLeverPostings({}, "X")).toThrow(AtsProviderError);
  });

  it("returns an empty list for an empty board", () => {
    expect(parseLeverPostings([], "X")).toEqual([]);
  });
});

describe("parseAshbyJobs", () => {
  it("normalizes jobs, strips HTML, and skips unlisted roles", () => {
    const postings = parseAshbyJobs(ASHBY_FIXTURE, "Linear");
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      title: "Senior / Staff Fullstack Engineer",
      company: "Linear",
      country: "European Union",
      remoteType: "remote",
      url: "https://jobs.ashbyhq.com/linear/d3bc1ced",
      description: "Build great software.",
      publishedAt: "2021-04-27T20:13:45.158+00:00",
    });
  });

  it("throws AtsProviderError on an unexpected shape", () => {
    expect(() => parseAshbyJobs({ jobs: null }, "X")).toThrow(
      AtsProviderError,
    );
  });
});

/* ------------------------------------------------------------------ */
/* Registry + URLs                                                     */
/* ------------------------------------------------------------------ */

describe("resolveAtsBoard", () => {
  it("resolves verified boards by normalized name", () => {
    expect(resolveAtsBoard("GitLab")).toEqual({
      provider: "greenhouse",
      token: "gitlab",
    });
    expect(resolveAtsBoard("  spotify ")).toEqual({
      provider: "lever",
      token: "spotify",
    });
    expect(resolveAtsBoard("Motive")).toEqual({
      provider: "greenhouse",
      token: "gomotive",
    });
  });

  it("returns null for companies with no verified board — never guesses", () => {
    expect(resolveAtsBoard("Systems Limited")).toBeNull();
    expect(resolveAtsBoard("Arbisoft")).toBeNull();
    expect(resolveAtsBoard("Netflix")).toBeNull();
    expect(resolveAtsBoard("")).toBeNull();
  });

  it("every registry entry carries verification metadata", () => {
    for (const board of KNOWN_ATS_BOARDS) {
      expect(board.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(board.postingsSeen).toBeGreaterThan(0);
      expect(board.token.length).toBeGreaterThan(0);
    }
  });
});

describe("board URLs", () => {
  it("builds the official API endpoints", () => {
    expect(
      atsBoardApiUrl({ provider: "greenhouse", token: "gitlab" }),
    ).toBe("https://boards-api.greenhouse.io/v1/boards/gitlab/jobs");
    expect(atsBoardApiUrl({ provider: "lever", token: "spotify" })).toBe(
      "https://api.lever.co/v0/postings/spotify",
    );
    expect(atsBoardApiUrl({ provider: "ashby", token: "linear" })).toBe(
      "https://api.ashbyhq.com/posting-api/job-board/linear",
    );
  });

  it("builds the human-facing board pages", () => {
    expect(
      atsBoardPageUrl({ provider: "greenhouse", token: "gomotive" }),
    ).toBe("https://job-boards.greenhouse.io/gomotive");
    expect(atsBoardPageUrl({ provider: "lever", token: "spotify" })).toBe(
      "https://jobs.lever.co/spotify",
    );
    expect(atsBoardPageUrl({ provider: "ashby", token: "ashby" })).toBe(
      "https://jobs.ashbyhq.com/ashby",
    );
  });
});

describe("createAtsProvider", () => {
  it("builds the right client per provider", () => {
    expect(
      createAtsProvider({ provider: "greenhouse", token: "x" }, "X"),
    ).toBeInstanceOf(GreenhouseProvider);
    expect(createAtsProvider({ provider: "lever", token: "x" }, "X")).toBeInstanceOf(
      LeverProvider,
    );
    expect(createAtsProvider({ provider: "ashby", token: "x" }, "X")).toBeInstanceOf(
      AshbyProvider,
    );
  });
});

/* ------------------------------------------------------------------ */
/* Live fetch behaviour (mocked fetch — no network in tests)           */
/* ------------------------------------------------------------------ */

function mockFetch(ok: boolean, payload: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => payload,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("provider fetch behaviour", () => {
  it("fetches and normalizes a Greenhouse board", async () => {
    vi.stubGlobal("fetch", mockFetch(true, GREENHOUSE_FIXTURE));
    const provider = new GreenhouseProvider(
      { provider: "greenhouse", token: "gitlab" },
      "GitLab",
    );
    const postings = await provider.fetchBoardPostings();
    expect(postings).toHaveLength(2);
    expect(fetch).toHaveBeenCalledWith(
      "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
  });

  it("filters by role substring in searchJobs", async () => {
    vi.stubGlobal("fetch", mockFetch(true, GREENHOUSE_FIXTURE));
    const provider = new GreenhouseProvider(
      { provider: "greenhouse", token: "gitlab" },
      "GitLab",
    );
    const postings = await provider.searchJobs({
      targetRole: "Backend Engineer",
      location: { country: null, city: null, workMode: null },
    });
    expect(postings).toHaveLength(1);
    expect(postings[0]?.title).toBe("Senior Backend Engineer");
  });

  it("throws AtsProviderError with the HTTP status on a 404 board", async () => {
    vi.stubGlobal("fetch", mockFetch(false, { error: "not found" }, 404));
    const provider = new LeverProvider(
      { provider: "lever", token: "netflix" },
      "Netflix",
    );
    let caught: unknown;
    try {
      await provider.fetchBoardPostings();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AtsProviderError);
    const error = caught as AtsProviderError;
    expect(error.status).toBe(404);
    expect(error.message).toMatch(/unavailable/);
  });

  it("throws AtsProviderError when the board is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ENOTFOUND")));
    const provider = new AshbyProvider(
      { provider: "ashby", token: "linear" },
      "Linear",
    );
    await expect(provider.fetchBoardPostings()).rejects.toBeInstanceOf(
      AtsProviderError,
    );
  });
});
